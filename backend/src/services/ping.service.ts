import { Monitor } from '@prisma/client';
import { PingErrorType } from '../types/index.js';
import { createLogger } from '../lib/logger.js';
import { isSsrfUrl } from '../lib/ssrf.js';

/**
 * Ping service - HTTP health check execution
 * Performs HTTP/HTTPS requests with timeout, redirect tracking, and keyword validation
 */

const logger = createLogger('worker', 'ping-service');

/**
 * Result of a ping execution
 */
export interface PingResult {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  errorType: PingErrorType | null;
  redirectCount: number;
  finalUrl: string;
}

/**
 * Maximum number of redirects to follow
 */
const MAX_REDIRECTS = 3;

/**
 * Execute an HTTP health check for a monitor
 * Handles timeouts, redirects, status codes, and keyword validation
 * 
 * @param monitor - Monitor configuration
 * @returns Ping result with status and timing information
 */
export async function executePing(monitor: Monitor): Promise<PingResult> {
  const startTime = Date.now();
  let redirectCount = 0;
  let currentUrl = monitor.url;
  let finalStatusCode: number | null = null;
  let finalResponse: Response | null = null;

  logger.debug({ monitorId: monitor.id, url: monitor.url }, 'Starting ping execution');

  try {
    // SSRF check at execution time (defense in depth)
    const isSsrf = await isSsrfUrl(currentUrl);
    if (isSsrf) {
      const responseTimeMs = Date.now() - startTime;
      logger.warn({ monitorId: monitor.id, url: currentUrl }, 'SSRF detected during ping');
      return {
        isUp: false,
        statusCode: null,
        responseTimeMs,
        errorType: 'CONNECTION_REFUSED',
        redirectCount: 0,
        finalUrl: currentUrl,
      };
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, monitor.timeoutSeconds * 1000);

    try {
      // Manual redirect following
      while (redirectCount <= MAX_REDIRECTS) {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'StatusPing/1.0 (Uptime Monitor)',
            Accept: '*/*',
          },
        });

        finalStatusCode = response.status;
        finalResponse = response;

        // Check if this is a redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('Location');

          if (!location) {
            // Redirect without Location header is an error
            break;
          }

          redirectCount++;

          if (redirectCount > MAX_REDIRECTS) {
            const responseTimeMs = Date.now() - startTime;
            clearTimeout(timeoutId);
            logger.warn(
              { monitorId: monitor.id, redirectCount, url: currentUrl },
              'Redirect limit exceeded'
            );
            return {
              isUp: false,
              statusCode: finalStatusCode,
              responseTimeMs,
              errorType: 'REDIRECT_LIMIT',
              redirectCount,
              finalUrl: currentUrl,
            };
          }

          // Handle relative and absolute redirects
          currentUrl = new URL(location, currentUrl).href;
          logger.debug(
            { monitorId: monitor.id, redirectCount, newUrl: currentUrl },
            'Following redirect'
          );
          continue;
        }

        // Not a redirect, we're done
        break;
      }

      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      // Check status code (2xx = success)
      const isStatusOk = finalStatusCode >= 200 && finalStatusCode < 300;

      if (!isStatusOk) {
        logger.debug(
          { monitorId: monitor.id, statusCode: finalStatusCode },
          'Non-2xx status code'
        );
        return {
          isUp: false,
          statusCode: finalStatusCode,
          responseTimeMs,
          errorType: 'HTTP_ERROR',
          redirectCount,
          finalUrl: currentUrl,
        };
      }

      // If keyword check is configured, validate response body
      if (monitor.keywordCheck && finalResponse) {
        try {
          const bodyText = await finalResponse.text();
          const keywordFound = bodyText.includes(monitor.keywordCheck);

          if (!keywordFound) {
            logger.debug(
              { monitorId: monitor.id, keyword: monitor.keywordCheck },
              'Keyword not found in response'
            );
            return {
              isUp: false,
              statusCode: finalStatusCode,
              responseTimeMs,
              errorType: 'HTTP_ERROR',
              redirectCount,
              finalUrl: currentUrl,
            };
          }

          logger.debug(
            { monitorId: monitor.id, keyword: monitor.keywordCheck },
            'Keyword found in response'
          );
        } catch (error) {
          logger.warn(
            { monitorId: monitor.id, err: error },
            'Failed to read response body for keyword check'
          );
          // Continue anyway - don't fail just because we couldn't read the body
        }
      }

      // All checks passed
      logger.info(
        { monitorId: monitor.id, statusCode: finalStatusCode, responseTimeMs, redirectCount },
        'Ping successful'
      );

      return {
        isUp: true,
        statusCode: finalStatusCode,
        responseTimeMs,
        errorType: null,
        redirectCount,
        finalUrl: currentUrl,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn({ monitorId: monitor.id, timeoutSeconds: monitor.timeoutSeconds }, 'Timeout');
        return {
          isUp: false,
          statusCode: null,
          responseTimeMs: monitor.timeoutSeconds * 1000,
          errorType: 'TIMEOUT',
          redirectCount,
          finalUrl: currentUrl,
        };
      }

      // Handle DNS/connection errors
      if (error instanceof TypeError) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('fetch failed') || errorMessage.includes('enotfound')) {
          logger.warn({ monitorId: monitor.id, err: error }, 'DNS failure');
          return {
            isUp: false,
            statusCode: null,
            responseTimeMs,
            errorType: 'DNS_FAILURE',
            redirectCount,
            finalUrl: currentUrl,
          };
        }

        if (errorMessage.includes('econnrefused')) {
          logger.warn({ monitorId: monitor.id, err: error }, 'Connection refused');
          return {
            isUp: false,
            statusCode: null,
            responseTimeMs,
            errorType: 'CONNECTION_REFUSED',
            redirectCount,
            finalUrl: currentUrl,
          };
        }

        if (
          errorMessage.includes('certificate') ||
          errorMessage.includes('ssl') ||
          errorMessage.includes('tls')
        ) {
          logger.warn({ monitorId: monitor.id, err: error }, 'SSL error');
          return {
            isUp: false,
            statusCode: null,
            responseTimeMs,
            errorType: 'SSL_ERROR',
            redirectCount,
            finalUrl: currentUrl,
          };
        }
      }

      // Unknown error
      logger.error({ monitorId: monitor.id, err: error }, 'Unknown ping error');
      return {
        isUp: false,
        statusCode: null,
        responseTimeMs,
        errorType: 'HTTP_ERROR',
        redirectCount,
        finalUrl: currentUrl,
      };
    }
  } catch (error) {
    // Catch-all for unexpected errors
    const responseTimeMs = Date.now() - startTime;
    logger.error({ monitorId: monitor.id, err: error }, 'Unexpected error during ping');
    return {
      isUp: false,
      statusCode: null,
      responseTimeMs,
      errorType: 'HTTP_ERROR',
      redirectCount,
      finalUrl: currentUrl,
    };
  }
}