import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { ApiResponse } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = Router();
const logger = createLogger('api', 'ping-logs-routes');

// Validation Schemas
const ListPingLogsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  isUp: z.coerce.boolean().optional(),
});

const ResponseTimesSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

// Helper Functions
async function verifyMonitorOwnership(monitorId: string, userId: string) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      userId,
      deletedAt: null,
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor not found');
  }

  return monitor;
}

// Routes
router.get('/:id/ping-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate query parameters
    const query = ListPingLogsSchema.parse(req.query);

    logger.debug({ userId, monitorId: id, query }, 'Fetching ping logs');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    // Set default date range (last 24 hours if not specified)
    const to = query.to || new Date();
    const from = query.from || new Date(to.getTime() - 24 * 60 * 60 * 1000);

    // Build where clause
    const where: any = {
      monitorId: id,
      checkedAt: {
        gte: from,
        lte: to,
      },
    };

    if (query.isUp !== undefined) {
      where.isUp = query.isUp;
    }

    // Get ping logs
    const pingLogs = await prisma.pingLog.findMany({
      where,
      orderBy: { checkedAt: 'desc' },
      take: query.limit,
    });

    // Get total count
    const total = await prisma.pingLog.count({ where });

    const response: ApiResponse<typeof pingLogs> = {
      data: pingLogs,
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        count: pingLogs.length,
        total,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching ping logs');
    next(error);
  }
});

router.get('/:id/response-times', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate query parameters
    const query = ResponseTimesSchema.parse(req.query);

    logger.debug({ userId, monitorId: id, days: query.days }, 'Fetching response times');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - query.days);

    // Get daily stats
    const dailyStats = await prisma.dailyStat.findMany({
      where: {
        monitorId: id,
        statDate: {
          gte: from,
          lte: to,
        },
      },
      select: {
        statDate: true,
        p50Ms: true,
        p95Ms: true,
        p99Ms: true,
        uptimePercent: true,
      },
      orderBy: { statDate: 'asc' },
    });

    const response: ApiResponse<typeof dailyStats> = {
      data: dailyStats,
      meta: {
        days: query.days,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching response times');
    next(error);
  }
});

export default router;