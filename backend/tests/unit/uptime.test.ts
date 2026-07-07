/**
 * Uptime calculation tests
 */

import { describe, it, expect } from 'vitest';
import { calculateUptimePercent, calculatePercentile, calculateResponseTimeStats } from '../../src/lib/uptime.js';

describe('calculateUptimePercent', () => {
  it('returns 100 when all checks pass', () => {
    const result = calculateUptimePercent(1440, 1440);
    expect(result).toBe(100);
  });

  it('returns 99.03 for 1440 checks with 14 failures (to 2 decimal places)', () => {
    const successful = 1440 - 14;
    const result = calculateUptimePercent(successful, 1440);
    expect(result).toBeCloseTo(99.03, 2);
  });

  it('returns 0 when all checks fail', () => {
    const result = calculateUptimePercent(0, 1440);
    expect(result).toBe(0);
  });

  it('returns null when total checks is 0 (avoid divide by zero)', () => {
    const result = calculateUptimePercent(0, 0);
    expect(result).toBeNull();
  });

  it('calculates correctly for partial day data', () => {
    const result = calculateUptimePercent(287, 288); // 1 failure in 288 checks
    expect(result).toBeCloseTo(99.65, 2);
  });

  it('returns exactly 50 for half success rate', () => {
    const result = calculateUptimePercent(720, 1440);
    expect(result).toBe(50);
  });
});

describe('calculatePercentile', () => {
  it('returns null for empty array', () => {
    const result = calculatePercentile([], 0.95);
    expect(result).toBeNull();
  });

  it('calculates p50 correctly', () => {
    const values = [100, 200, 300, 400, 500];
    const result = calculatePercentile(values, 0.5);
    expect(result).toBe(300);
  });

  it('calculates p95 correctly', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 0.95);
    expect(result).toBe(95);
  });

  it('calculates p99 correctly', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 0.99);
    expect(result).toBe(99);
  });

  it('handles single value', () => {
    const result = calculatePercentile([100], 0.95);
    expect(result).toBe(100);
  });

  it('handles unsorted array correctly', () => {
    const values = [500, 100, 300, 200, 400];
    const result = calculatePercentile(values, 0.5);
    expect(result).toBe(300);
  });
});

describe('calculateResponseTimeStats', () => {
  it('returns all null for empty array', () => {
    const result = calculateResponseTimeStats([]);
    expect(result).toEqual({
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
    });
  });

  it('calculates all percentiles correctly', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculateResponseTimeStats(values);
    expect(result.p50Ms).toBe(50);
    expect(result.p95Ms).toBe(95);
    expect(result.p99Ms).toBe(99);
  });
});