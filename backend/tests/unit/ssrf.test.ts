/**
 * SSRF protection tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSsrfUrl } from '../../src/lib/ssrf.js';
import * as dns from 'dns/promises';

// Mock DNS module
vi.mock('dns/promises', () => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));

describe('isSsrfUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for 127.0.0.1', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['127.0.0.1']);
    const result = await isSsrfUrl('http://127.0.0.1');
    expect(result).toBe(true);
  });

  it('returns true for localhost', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['127.0.0.1']);
    const result = await isSsrfUrl('http://localhost');
    expect(result).toBe(true);
  });

  it('returns true for 10.0.0.1', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['10.0.0.1']);
    const result = await isSsrfUrl('http://10.0.0.1');
    expect(result).toBe(true);
  });

  it('returns true for 192.168.1.1', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['192.168.1.1']);
    const result = await isSsrfUrl('http://192.168.1.1');
    expect(result).toBe(true);
  });

  it('returns true for 169.254.169.254 (AWS metadata)', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['169.254.169.254']);
    const result = await isSsrfUrl('http://169.254.169.254');
    expect(result).toBe(true);
  });

  it('returns true for 172.16.0.1', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['172.16.0.1']);
    const result = await isSsrfUrl('http://172.16.0.1');
    expect(result).toBe(true);
  });

  it('returns false for a real public IP', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['8.8.8.8']);
    const result = await isSsrfUrl('http://8.8.8.8');
    expect(result).toBe(false);
  });

  it('returns false for https://github.com', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['140.82.121.4']);
    const result = await isSsrfUrl('https://github.com');
    expect(result).toBe(false);
  });

  it('returns false for https://example.com', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['93.184.216.34']);
    const result = await isSsrfUrl('https://example.com');
    expect(result).toBe(false);
  });

  it('returns true for invalid URL', async () => {
    const result = await isSsrfUrl('not-a-url');
    expect(result).toBe(true);
  });

  it('returns true when DNS resolution fails', async () => {
    vi.mocked(dns.resolve4).mockRejectedValue(new Error('ENOTFOUND'));
    vi.mocked(dns.resolve6).mockRejectedValue(new Error('ENOTFOUND'));
    const result = await isSsrfUrl('http://nonexistent.local');
    expect(result).toBe(true);
  });

  it('checks hostname directly if it is an IP', async () => {
    const result = await isSsrfUrl('http://192.168.1.100');
    expect(result).toBe(true);
    // Should detect private IP without calling DNS
  });
});