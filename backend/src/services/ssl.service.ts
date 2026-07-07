import * as tls from 'tls';
import { createLogger } from '../lib/logger.js';

/**
 * SSL certificate checking service
 * Verifies SSL certificates and tracks expiration dates
 */

const logger = createLogger('worker', 'ssl-service');

/**
 * Result of an SSL certificate check
 */
export interface SslResult {
  isValid: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
  issuer: string | null;
  errorMessage: string | null;
}

/**
 * SSL check timeout in milliseconds
 */
const SSL_CHECK_TIMEOUT = 10000;

/**
 * Extract hostname and port from a URL
 * @param url - Full URL string
 * @returns Object with hostname and port
 */
function parseUrl(url: string): { hostname: string; port: number } {
  try {
    const urlObj = new URL(url);
    return {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Calculate days remaining until a date
 * @param expiryDate - Expiration date
 * @returns Number of days remaining (can be negative if expired)
 */
function calculateDaysRemaining(expiryDate: Date): number {
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check SSL certificate for a hostname
 * Connects via TLS and retrieves certificate information
 * 
 * @param url - Full HTTPS URL to check
 * @returns SSL check result with validity and expiration info
 */
export async function checkSsl(url: string): Promise<SslResult> {
  logger.debug({ url }, 'Starting SSL check');

  try {
    const { hostname, port } = parseUrl(url);

    return await new Promise<SslResult>((resolve) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        logger.warn({ url, hostname }, 'SSL check timeout');
        resolve({
          isValid: false,
          expiresAt: null,
          daysRemaining: null,
          issuer: null,
          errorMessage: 'Connection timeout',
        });
      }, SSL_CHECK_TIMEOUT);

      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname, // SNI
          rejectUnauthorized: false, // We want to check even invalid certs
        },
        () => {
          clearTimeout(timeout);

          try {
            const cert = socket.getPeerCertificate();

            if (!cert || Object.keys(cert).length === 0) {
              socket.destroy();
              logger.warn({ url, hostname }, 'No certificate found');
              resolve({
                isValid: false,
                expiresAt: null,
                daysRemaining: null,
                issuer: null,
                errorMessage: 'No certificate found',
              });
              return;
            }

            // Check if certificate is valid (authorized)
            const isValid = socket.authorized;
            const authError = socket.authorizationError?.message || null;

            // Parse expiration date
            const expiresAt = new Date(cert.valid_to);
            const daysRemaining = calculateDaysRemaining(expiresAt);

            // Extract issuer information (cert fields may be string or string[])
            const rawIssuer = cert.issuer?.O || cert.issuer?.CN || 'Unknown';
            const issuer = Array.isArray(rawIssuer) ? rawIssuer.join(', ') : rawIssuer;

            socket.destroy();

            logger.info(
              { url, hostname, isValid, daysRemaining, issuer },
              'SSL check completed'
            );

            resolve({
              isValid,
              expiresAt,
              daysRemaining,
              issuer,
              errorMessage: isValid ? null : authError,
            });
          } catch (error) {
            socket.destroy();
            logger.error({ url, hostname, err: error }, 'Error parsing certificate');
            resolve({
              isValid: false,
              expiresAt: null,
              daysRemaining: null,
              issuer: null,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      );

      socket.on('error', (error) => {
        clearTimeout(timeout);
        logger.warn({ url, hostname, err: error }, 'SSL connection error');
        resolve({
          isValid: false,
          expiresAt: null,
          daysRemaining: null,
          issuer: null,
          errorMessage: error.message,
        });
      });
    });
  } catch (error) {
    logger.error({ url, err: error }, 'SSL check failed');
    return {
      isValid: false,
      expiresAt: null,
      daysRemaining: null,
      issuer: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an SSL check should be performed for a monitor
 * Only check HTTPS URLs, and not more than once per 24 hours
 * 
 * @param url - Monitor URL
 * @param lastCheckDate - Date of last SSL check (or null)
 * @returns True if SSL check should be performed
 */
export function shouldCheckSsl(url: string, lastCheckDate: Date | null): boolean {
  // Only check HTTPS URLs
  if (!url.startsWith('https://')) {
    return false;
  }

  // If never checked, check now
  if (!lastCheckDate) {
    return true;
  }

  // Check if last check was more than 24 hours ago
  const hoursSinceLastCheck =
    (Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastCheck >= 24;
}