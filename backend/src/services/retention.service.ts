import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'retention-service');

// Result of retention operation
export interface RetentionResult {
  monitorsProcessed: number;
  dailyStatsUpserted: number;
  pingLogsDeleted: number;
  hardDeletedMonitors: number;
}

async function aggregateDailyStats(monitorId: string, date: Date) {
  // Get start and end of day in UTC
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Aggregate using raw SQL for percentile calculations
  const result = await prisma.$queryRaw<
    Array<{
      total_checks: bigint;
      successful_checks: bigint;
      p50: number | null;
      p95: number | null;
      p99: number | null;
    }>
  >`
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN "isUp" THEN 1 ELSE 0 END) as successful_checks,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "responseTimeMs") as p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "responseTimeMs") as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "responseTimeMs") as p99
    FROM "PingLog"
    WHERE "monitorId" = ${monitorId}
      AND "checkedAt" >= ${startOfDay}
      AND "checkedAt" <= ${endOfDay}
      AND "isUp" = true
      AND "responseTimeMs" IS NOT NULL
  `;

  if (result.length === 0 || result[0].total_checks === BigInt(0)) {
    return null;
  }

  const stats = result[0];
  const totalChecks = Number(stats.total_checks);
  const successfulChecks = Number(stats.successful_checks);
  const uptimePercent = ((successfulChecks / totalChecks) * 100).toFixed(2);

  return {
    monitorId,
    statDate: startOfDay,
    totalChecks,
    successfulChecks,
    uptimePercent: parseFloat(uptimePercent),
    p50Ms: stats.p50 ? Math.round(stats.p50) : null,
    p95Ms: stats.p95 ? Math.round(stats.p95) : null,
    p99Ms: stats.p99 ? Math.round(stats.p99) : null,
  };
}

export async function runRetention(): Promise<RetentionResult> {
  logger.info('Starting retention operation');

  const result: RetentionResult = {
    monitorsProcessed: 0,
    dailyStatsUpserted: 0,
    pingLogsDeleted: 0,
    hardDeletedMonitors: 0,
  };

  try {
    
    // Step 1: Aggregate ping logs into daily stats
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - env.PING_LOG_RETENTION_DAYS);
    retentionDate.setHours(0, 0, 0, 0);

    logger.info({ retentionDate }, 'Aggregating ping logs older than retention date');

    // Get distinct monitor IDs that have old ping logs
    const monitorsWithOldLogs = await prisma.$queryRaw<Array<{ monitorId: string }>>`
      SELECT DISTINCT "monitorId"
      FROM "PingLog"
      WHERE "checkedAt" < ${retentionDate}
    `;

    logger.info(
      { count: monitorsWithOldLogs.length },
      'Found monitors with old ping logs'
    );

    for (const { monitorId } of monitorsWithOldLogs) {
      try {
        // Get distinct dates for this monitor
        const dates = await prisma.$queryRaw<Array<{ date: Date }>>`
          SELECT DISTINCT DATE("checkedAt") as date
          FROM "PingLog"
          WHERE "monitorId" = ${monitorId}
            AND "checkedAt" < ${retentionDate}
          ORDER BY date
        `;

        logger.debug({ monitorId, dateCount: dates.length }, 'Processing monitor dates');

        for (const { date } of dates) {
          try {
            const stats = await aggregateDailyStats(monitorId, date);

            if (stats) {
              // Upsert daily stat
              await prisma.dailyStat.upsert({
                where: {
                  monitorId_statDate: {
                    monitorId: stats.monitorId,
                    statDate: stats.statDate,
                  },
                },
                create: stats,
                update: {
                  totalChecks: stats.totalChecks,
                  successfulChecks: stats.successfulChecks,
                  uptimePercent: stats.uptimePercent,
                  p50Ms: stats.p50Ms,
                  p95Ms: stats.p95Ms,
                  p99Ms: stats.p99Ms,
                },
              });

              result.dailyStatsUpserted++;
            }
          } catch (error) {
            logger.error(
              { err: error, monitorId, date },
              'Error aggregating daily stats for date'
            );
            // Continue with next date
          }
        }

        result.monitorsProcessed++;
      } catch (error) {
        logger.error({ err: error, monitorId }, 'Error processing monitor');
        // Continue with next monitor
      }
    }

    logger.info(
      { monitorsProcessed: result.monitorsProcessed, statsUpserted: result.dailyStatsUpserted },
      'Aggregation complete'
    );
    
    // Step 2: Delete old ping logs
    logger.info({ retentionDate }, 'Deleting ping logs older than retention date');

    const deleteResult = await prisma.pingLog.deleteMany({
      where: {
        checkedAt: {
          lt: retentionDate,
        },
      },
    });

    result.pingLogsDeleted = deleteResult.count;

    logger.info({ count: result.pingLogsDeleted }, 'Old ping logs deleted');

    // Step 3: Hard delete old soft-deleted monitors
    const hardDeleteDate = new Date();
    hardDeleteDate.setDate(hardDeleteDate.getDate() - 30);

    logger.info({ hardDeleteDate }, 'Hard deleting monitors soft-deleted before date');

    const monitorsToHardDelete = await prisma.monitor.findMany({
      where: {
        deletedAt: {
          lt: hardDeleteDate,
          not: null,
        },
      },
      select: { id: true },
    });

    for (const monitor of monitorsToHardDelete) {
      try {
        // Delete monitor (cascades to related records)
        await prisma.monitor.delete({
          where: { id: monitor.id },
        });

        result.hardDeletedMonitors++;
      } catch (error) {
        logger.error({ err: error, monitorId: monitor.id }, 'Error hard deleting monitor');
        // Continue with next monitor
      }
    }

    logger.info({ count: result.hardDeletedMonitors }, 'Monitors hard deleted');

    // Summary  
    logger.info(
      {
        monitorsProcessed: result.monitorsProcessed,
        dailyStatsUpserted: result.dailyStatsUpserted,
        pingLogsDeleted: result.pingLogsDeleted,
        hardDeletedMonitors: result.hardDeletedMonitors,
      },
      'Retention operation completed successfully'
    );

    return result;
  } catch (error) {
    logger.error({ err: error }, 'Retention operation failed');
    throw error;
  }
}