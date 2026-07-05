export function calculateUptimePercent(
  successfulChecks: number,
  totalChecks: number
): number | null {
  if (totalChecks === 0) {
    return null;
  }

  const percent = (successfulChecks / totalChecks) * 100;
  return Math.round(percent * 100) / 100; // Round to 2 decimal places
}

export function calculatePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[Math.max(0, index)];
}

export function calculateResponseTimeStats(responseTimes: number[]): {
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
} {
  if (responseTimes.length === 0) {
    return { p50Ms: null, p95Ms: null, p99Ms: null };
  }

  return {
    p50Ms: calculatePercentile(responseTimes, 0.5),
    p95Ms: calculatePercentile(responseTimes, 0.95),
    p99Ms: calculatePercentile(responseTimes, 0.99),
  };
}


export function calculateUptimeFromDailyStats(
  dailyStats: Array<{ totalChecks: number; successfulChecks: number }>
): number | null {
  if (dailyStats.length === 0) {
    return null;
  }

  const totalChecks = dailyStats.reduce((sum, stat) => sum + stat.totalChecks, 0);
  const totalSuccessful = dailyStats.reduce((sum, stat) => sum + stat.successfulChecks, 0);

  return calculateUptimePercent(totalSuccessful, totalChecks);
}