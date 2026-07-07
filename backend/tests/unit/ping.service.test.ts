/**
 * Ping service tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePing } from '../../src/services/ping.service.js';
import { Monitor } from '@prisma/client';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock SSRF check
vi.mock('../../src/lib/ssrf.js', () => ({
  isSsrfUrl: vi.fn().mockResolvedValue(false),
}));

describe('executePing', () => {
  const mockMonitor: Monitor = {
    id: 'monitor-1',
    userId: 'user-1',
    name: 'Test Monitor',
    url: 'https://example.com',
    checkIntervalMinutes: 5,
    failureThreshold: 2,
    timeoutSeconds: 10,
    keywordCheck: null,
    status: 'active',
    consecutiveFailures: 0,
    statusPageVisible: true,
    lastCheckedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isUp=true when target responds 200', async () => {
    mockFetch.mockResolvedValue(
      new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const result = await executePing(mockMonitor);

    expect(result.isUp).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.errorType).toBeNull();
    expect(result.responseTimeMs).toBeGreaterThan(0);
  });

  it('returns isUp=false with errorType=TIMEOUT when request times out', async () => {
    mockFetch.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        }, 100);
      });
    });

    const result = await executePing({ ...mockMonitor, timeoutSeconds: 1 });

    expect(result.isUp).toBe(false);
    expect(result.errorType).toBe('TIMEOUT');
  });

  it('returns isUp=false with errorType=DNS_FAILURE when hostname cannot be resolved', async () => {
    const error = new TypeError('fetch failed');
    Object.defineProperty(error, 'message', { value: 'fetch failed: getaddrinfo ENOTFOUND' });
    mockFetch.mockRejectedValue(error);

    const result = await executePing(mockMonitor);

    expect(result.isUp).toBe(false);
    expect(result.errorType).toBe('DNS_FAILURE');
  });

  it('returns isUp=false with errorType=HTTP_ERROR when keyword check fails', async () => {
    mockFetch.mockResolvedValue(
      new Response('Wrong content', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const result = await executePing({
      ...mockMonitor,
      keywordCheck: 'ExpectedKeyword',
    });

    expect(result.isUp).toBe(false);
    expect(result.errorType).toBe('HTTP_ERROR');
    expect(result.statusCode).toBe(200);
  });

  it('returns isUp=false with errorType=REDIRECT_LIMIT when redirect count exceeds 3', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      return Promise.resolve(
        new Response(null, {
          status: 301,
          headers: { Location: `https://example.com/redirect${callCount}` },
        })
      );
    });

    const result = await executePing(mockMonitor);

    expect(result.isUp).toBe(false);
    expect(result.errorType).toBe('REDIRECT_LIMIT');
    expect(result.redirectCount).toBeGreaterThan(3);
  });

  it('tracks redirect count correctly', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(null, {
            status: 301,
            headers: { Location: 'https://example.com/step1' },
          })
        );
      } else if (callCount === 2) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: 'https://example.com/final' },
          })
        );
      } else {
        return Promise.resolve(new Response('OK', { status: 200 }));
      }
    });

    const result = await executePing(mockMonitor);

    expect(result.isUp).toBe(true);
    expect(result.redirectCount).toBe(2);
    expect(result.finalUrl).toBe('https://example.com/final');
  });

  it('measures responseTimeMs correctly', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(new Response('OK', { status: 200 }));
          }, 100);
        })
    );

    const result = await executePing(mockMonitor);

    expect(result.responseTimeMs).toBeGreaterThanOrEqual(100);
    expect(result.responseTimeMs).toBeLessThan(200);
  });

  it('returns isUp=false for non-2xx status codes', async () => {
    mockFetch.mockResolvedValue(new Response('Server Error', { status: 500 }));

    const result = await executePing(mockMonitor);

    expect(result.isUp).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorType).toBe('HTTP_ERROR');
  });
});