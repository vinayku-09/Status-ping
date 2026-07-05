/**
 * SSRF (Server-Side Request Forgery) prevention
 * Blocks requests to private IP ranges and localhost
 */

import { promises as dns } from 'dns';
import { createLogger } from './logger.js';

const logger = createLogger('api', 'ssrf');

/**
 * Private IP ranges that should be blocked
 */
const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  /^127\./,                    // 127.0.0.0/8 - Loopback
  /^10\./,                     // 10.0.0.0/8 - Private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12 - Private
  /^192\.168\./,               // 192.168.0.0/16 - Private
  /^169\.254\./,               // 169.254.0.0/16 - Link-local
  /^0\./,                      // 0.0.0.0/8 - Current network
  /^224\./,                    // 224.0.0.0/4 - Multicast
  /^240\./,                    // 240.0.0.0/4 - Reserved
  
  // IPv6 private ranges
  /^::1$/,                     // ::1 - Loopback
  /^fe80:/,                    // fe80::/10 - Link-local
  /^fc00:/,                    // fc00::/7 - Unique local
  /^ff00:/,                    // ff00::/8 - Multicast
];

/**
 * Check if an IP address is in a private range
 * @param ip - IP address to check
 * @returns True if the IP is private/internal
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => range.test(ip));
}

/**
 * Extract hostname from a URL
 * @param url - Full URL string
 * @returns Hostname
 * @throws Error if URL is invalid
 */
function extractHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

/**
 * Resolve a hostname to IP addresses
 * @param hostname - Hostname to resolve
 * @returns Array of IP addresses
 * @throws Error if DNS resolution fails
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  try {
    // Try IPv4 first
    const addresses = await dns.resolve4(hostname);
    return addresses;
  } catch (error) {
    // Fallback to IPv6 if IPv4 fails
    try {
      const addresses = await dns.resolve6(hostname);
      return addresses;
    } catch (ipv6Error) {
      // If both fail, the hostname might be an IP address itself
      // Return it as-is for validation
      return [hostname];
    }
  }
}

/**
 * Check if a URL resolves to a private/internal IP address
 * This prevents SSRF attacks by blocking requests to internal infrastructure
 * 
 * @param url - Full URL to check
 * @returns True if the URL resolves to a private IP or is invalid
 * 
 * @example
 * await isSsrfUrl('http://localhost') // true
 * await isSsrfUrl('http://192.168.1.1') // true
 * await isSsrfUrl('https://github.com') // false
 */
export async function isSsrfUrl(url: string): Promise<boolean> {
  try {
    // Extract hostname from URL
    const hostname = extractHostname(url);
    
    logger.debug({ url, hostname }, 'Checking URL for SSRF');

    // Check if hostname is already an IP address
    if (isPrivateIP(hostname)) {
      logger.warn({ url, hostname }, 'SSRF detected: hostname is a private IP');
      return true;
    }

    // Resolve hostname to IP addresses
    const ips = await resolveHostname(hostname);
    
    logger.debug({ url, hostname, ips }, 'DNS resolution result');

    // Check if any resolved IP is private
    for (const ip of ips) {
      if (isPrivateIP(ip)) {
        logger.warn({ url, hostname, ip }, 'SSRF detected: resolved to private IP');
        return true;
      }
    }

    logger.debug({ url, hostname, ips }, 'URL passed SSRF check');
    return false;
  } catch (error) {
    // If we can't resolve or parse the URL, treat it as suspicious
    logger.warn({ url, err: error }, 'SSRF check failed, treating as unsafe');
    return true;
  }
}

/**
 * Validate a URL and check for SSRF
 * @param url - URL to validate
 * @throws Error if URL is invalid or resolves to private IP
 */
export async function validateUrl(url: string): Promise<void> {
  // Check if it's a valid URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error('Invalid URL format');
  }

  // Check for SSRF
  const isSsrf = await isSsrfUrl(url);
  
  if (isSsrf) {
    throw new Error('URL resolves to a private IP address and cannot be monitored');
  }
}