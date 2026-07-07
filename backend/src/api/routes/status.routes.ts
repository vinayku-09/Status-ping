import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { redis } from '../../config/redis.js';
import { ApiResponse } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = Router();
const logger = createLogger('api', 'status-routes');

// Cache key for status page data
const CACHE_KEY = 'status:page:data';

// Cache TTL in seconds
const CACHE_TTL = 60;

// Overall status determination
type OverallStatus = 'operational' | 'degraded' | 'outage';

// Calculate overall status from monitor statuses
function calculateOverallStatus(monitors: Array<{ status: string }>): OverallStatus {
  if (monitors.length === 0) {
    return 'operational';
  }

  const hasDown = monitors.some((m) => m.status === 'down');
  const hasDegraded = monitors.some((m) => m.status === 'degraded');

  if (hasDown) {
    return 'outage';
  }

  if (hasDegraded) {
    return 'degraded';
  }

  return 'operational';
}

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    logger.debug('Fetching status page data');

    // Try to get from cache first
    const cached = await redis.get(CACHE_KEY);

    if (cached) {
      logger.debug('Status page cache hit');
      const data = JSON.parse(cached);
      res.status(200).json(data);
      return;
    }

    logger.debug('Status page cache miss, fetching from database');

    // Fetch all visible monitors
    const monitors = await prisma.monitor.findMany({
      where: {
        statusPageVisible: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    // Fetch 90-day uptime history for each monitor
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const monitorsWithUptime = await Promise.all(
      monitors.map(async (monitor) => {
        const dailyStats = await prisma.dailyStat.findMany({
          where: {
            monitorId: monitor.id,
            statDate: {
              gte: ninetyDaysAgo,
            },
          },
          select: {
            statDate: true,
            uptimePercent: true,
          },
          orderBy: { statDate: 'asc' },
        });

        // Fill in missing days with null
        const uptime90d: Array<{ date: string; uptimePercent: number | null }> = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 89; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const stat = dailyStats.find(
            (s) => s.statDate.toISOString().split('T')[0] === dateStr
          );

          uptime90d.push({
            date: dateStr,
            uptimePercent: stat?.uptimePercent
              ? parseFloat(stat.uptimePercent.toString())
              : null,
          });
        }

        return {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
          status: monitor.status,
          uptime90d,
        };
      })
    );

    // Fetch active (open) incidents
    const activeIncidents = await prisma.incident.findMany({
      where: {
        status: 'open',
        deletedAt: null,
        monitor: {
          statusPageVisible: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        startedAt: true,
        errorType: true,
        monitor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 10, // Limit to 10 most recent
    });

    // Calculate overall status
    const overallStatus = calculateOverallStatus(monitorsWithUptime);

    // Build response
    const cachedAt = new Date().toISOString();
    const responseData: ApiResponse<{
      overallStatus: OverallStatus;
      monitors: typeof monitorsWithUptime;
      activeIncidents: typeof activeIncidents;
    }> = {
      data: {
        overallStatus,
        monitors: monitorsWithUptime,
        activeIncidents,
      },
      meta: {
        cachedAt,
        cacheTtlSeconds: CACHE_TTL,
      },
    };

    // Cache the response
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(responseData));

    logger.info(
      {
        monitorCount: monitorsWithUptime.length,
        activeIncidentCount: activeIncidents.length,
        overallStatus,
      },
      'Status page data fetched and cached'
    );

    res.status(200).json(responseData);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching status page data');
    next(error);
  }
});

export default router;