/**
 * Monitor management routes
 * CRUD operations for uptime monitors
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { pingQueue } from '../../queues/index.js';
import { registerMonitorJob, removeMonitorJob, enqueueImmediatePing } from '../../queues/helpers.js';
import { validateUrl } from '../../lib/ssrf.js';
import { calculateUptimeFromDailyStats } from '../../lib/uptime.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
  ConflictError,
} from '../../lib/errors.js';
import { ApiResponse, PaginationMeta } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const router = Router();
const logger = createLogger('api', 'monitors-routes');

====
// Validation Schemas
====

const CreateMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  url: z.string().url('Invalid URL format'),
  checkIntervalMinutes: z
    .number()
    .int()
    .refine((val) => [1, 5, 15, 30, 60].includes(val), {
      message: 'Check interval must be one of: 1, 5, 15, 30, 60 minutes',
    }),
  failureThreshold: z
    .number()
    .int()
    .min(1, 'Failure threshold must be at least 1')
    .max(5, 'Failure threshold must be at most 5')
    .default(2),
  timeoutSeconds: z
    .number()
    .int()
    .min(5, 'Timeout must be at least 5 seconds')
    .max(30, 'Timeout must be at most 30 seconds')
    .default(10),
  keywordCheck: z.string().max(200, 'Keyword must be at most 200 characters').optional(),
  statusPageVisible: z.boolean().default(true),
});

const UpdateMonitorSchema = CreateMonitorSchema.partial();

const ListMonitorsSchema = z.object({
  status: z.enum(['pending', 'active', 'degraded', 'down', 'paused']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', 'name', 'status', 'lastCheckedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const DeleteMonitorSchema = z.object({
  force: z.coerce.boolean().default(false),
});

====
// Helper Functions
====

/**
 * Calculate 30-day uptime for a monitor from daily stats
 */
async function calculate30DayUptime(monitorId: string): Promise<number | null> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await prisma.dailyStat.findMany({
    where: {
      monitorId,
      statDate: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      totalChecks: true,
      successfulChecks: true,
    },
  });

  return calculateUptimeFromDailyStats(dailyStats);
}

/**
 * Verify monitor ownership
 */
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

====
// Routes
====

/**
 * GET /api/monitors
 * List all monitors for the authenticated user
 * 
 * @query {status?, page, limit, sort, order}
 * @returns {200} Paginated list of monitors
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;

    // Validate query parameters
    const query = ListMonitorsSchema.parse(req.query);

    logger.debug({ userId, query }, 'Listing monitors');

    // Build where clause
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    // Get total count
    const total = await prisma.monitor.count({ where });

    // Get monitors with pagination
    const monitors = await prisma.monitor.findMany({
      where,
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        checkIntervalMinutes: true,
        failureThreshold: true,
        timeoutSeconds: true,
        keywordCheck: true,
        statusPageVisible: true,
        consecutiveFailures: true,
        lastCheckedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        [query.sort]: query.order,
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Calculate uptime for each monitor
    const monitorsWithUptime = await Promise.all(
      monitors.map(async (monitor) => {
        const uptimePercent30d = await calculate30DayUptime(monitor.id);
        return {
          ...monitor,
          uptimePercent30d,
        };
      })
    );

    const pagination: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };

    const response: ApiResponse<typeof monitorsWithUptime> = {
      data: monitorsWithUptime,
      meta: { pagination },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error listing monitors');
    next(error);
  }
});

/**
 * POST /api/monitors
 * Create a new monitor
 * 
 * @body {name, url, checkIntervalMinutes, failureThreshold?, timeoutSeconds?, keywordCheck?, statusPageVisible?}
 * @returns {201} Created monitor
 * @throws {422} SSRF detected (private IP)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;

    // Validate request body
    const data = CreateMonitorSchema.parse(req.body);

    logger.info({ userId, url: data.url }, 'Creating monitor');

    // SSRF check
    try {
      await validateUrl(data.url);
    } catch (error) {
      throw new UnprocessableError(
        error instanceof Error ? error.message : 'Invalid URL',
        { url: data.url }
      );
    }

    // Create monitor
    const monitor = await prisma.monitor.create({
      data: {
        userId,
        name: data.name,
        url: data.url,
        checkIntervalMinutes: data.checkIntervalMinutes,
        failureThreshold: data.failureThreshold,
        timeoutSeconds: data.timeoutSeconds,
        keywordCheck: data.keywordCheck || null,
        statusPageVisible: data.statusPageVisible,
        status: 'pending',
      },
    });

    // Register BullMQ repeatable job
    await registerMonitorJob(pingQueue, monitor.id, monitor.checkIntervalMinutes);

    // Enqueue immediate first ping
    await enqueueImmediatePing(pingQueue, monitor.id);

    logger.info({ userId, monitorId: monitor.id }, 'Monitor created successfully');

    const response: ApiResponse<typeof monitor> = {
      data: monitor,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error creating monitor');
    next(error);
  }
});

/**
 * GET /api/monitors/:id
 * Get a single monitor with details
 * 
 * @param {id} Monitor ID
 * @returns {200} Monitor with ping logs, incidents, and SSL check
 * @throws {403} Monitor belongs to another user
 * @throws {404} Monitor not found
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    logger.debug({ userId, monitorId: id }, 'Fetching monitor details');

    // Verify ownership
    const monitor = await verifyMonitorOwnership(id, userId);

    // Get last 20 ping logs
    const pingLogs = await prisma.pingLog.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take: 20,
    });

    // Get current open incident
    const openIncident = await prisma.incident.findFirst({
      where: {
        monitorId: id,
        status: 'open',
        deletedAt: null,
      },
    });

    // Get latest SSL check
    const latestSslCheck = await prisma.sslCheck.findFirst({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
    });

    // Calculate uptime and response time stats
    const uptimePercent30d = await calculate30DayUptime(id);

    // Calculate p95 response time from recent ping logs
    const recentResponseTimes = pingLogs
      .filter((log) => log.isUp && log.responseTimeMs !== null)
      .map((log) => log.responseTimeMs!);

    const p95ResponseTimeMs =
      recentResponseTimes.length > 0
        ? recentResponseTimes.sort((a, b) => a - b)[
            Math.floor(recentResponseTimes.length * 0.95)
          ]
        : null;

    const response: ApiResponse<{
      monitor: typeof monitor;
      pingLogs: typeof pingLogs;
      openIncident: typeof openIncident;
      latestSslCheck: typeof latestSslCheck;
      stats: {
        uptimePercent30d: number | null;
        p95ResponseTimeMs: number | null;
      };
    }> = {
      data: {
        monitor,
        pingLogs,
        openIncident,
        latestSslCheck,
        stats: {
          uptimePercent30d,
          p95ResponseTimeMs,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching monitor');
    next(error);
  }
});

/**
 * PATCH /api/monitors/:id
 * Update a monitor
 * 
 * @param {id} Monitor ID
 * @body Partial monitor data
 * @returns {200} Updated monitor
 * @throws {403} Monitor belongs to another user
 * @throws {404} Monitor not found
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate request body
    const data = UpdateMonitorSchema.parse(req.body);

    logger.info({ userId, monitorId: id, updates: Object.keys(data) }, 'Updating monitor');

    // Verify ownership
    const existingMonitor = await verifyMonitorOwnership(id, userId);

    // SSRF check if URL is being updated
    if (data.url) {
      try {
        await validateUrl(data.url);
      } catch (error) {
        throw new UnprocessableError(
          error instanceof Error ? error.message : 'Invalid URL',
          { url: data.url }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...data };

    // If URL changed, reset consecutive failures
    if (data.url && data.url !== existingMonitor.url) {
      updateData.consecutiveFailures = 0;
    }

    // Update monitor
    const monitor = await prisma.monitor.update({
      where: { id },
      data: updateData,
    });

    // Handle status changes
    if (data.status === 'paused' && existingMonitor.status !== 'paused') {
      // Remove BullMQ job when pausing
      await removeMonitorJob(pingQueue, id);
      logger.info({ monitorId: id }, 'Monitor paused, job removed');
    } else if (data.status === 'active' && existingMonitor.status === 'paused') {
      // Re-register job when resuming
      await registerMonitorJob(pingQueue, id, monitor.checkIntervalMinutes);
      await enqueueImmediatePing(pingQueue, id);
      logger.info({ monitorId: id }, 'Monitor resumed, job registered');
    }

    // Handle interval changes
    if (
      data.checkIntervalMinutes &&
      data.checkIntervalMinutes !== existingMonitor.checkIntervalMinutes &&
      monitor.status !== 'paused'
    ) {
      await registerMonitorJob(pingQueue, id, data.checkIntervalMinutes);
      logger.info(
        { monitorId: id, newInterval: data.checkIntervalMinutes },
        'Monitor interval updated, job re-registered'
      );
    }

    logger.info({ userId, monitorId: id }, 'Monitor updated successfully');

    const response: ApiResponse<typeof monitor> = {
      data: monitor,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error updating monitor');
    next(error);
  }
});

/**
 * DELETE /api/monitors/:id
 * Soft delete a monitor
 * 
 * @param {id} Monitor ID
 * @query {force} Force delete even with open incident
 * @returns {204} No content
 * @throws {403} Monitor belongs to another user
 * @throws {404} Monitor not found
 * @throws {409} Open incident exists without force=true
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate query parameters
    const query = DeleteMonitorSchema.parse(req.query);

    logger.info({ userId, monitorId: id, force: query.force }, 'Deleting monitor');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    // Check for open incidents
    const openIncident = await prisma.incident.findFirst({
      where: {
        monitorId: id,
        status: 'open',
        deletedAt: null,
      },
    });

    if (openIncident && !query.force) {
      throw new ConflictError(
        'Cannot delete monitor with open incident. Use ?force=true to override.',
        { incidentId: openIncident.id }
      );
    }

    // Soft delete monitor
    await prisma.monitor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Remove BullMQ repeatable job
    await removeMonitorJob(pingQueue, id);

    logger.info({ userId, monitorId: id }, 'Monitor deleted successfully');

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, 'Error deleting monitor');
    next(error);
  }
});

export default router;