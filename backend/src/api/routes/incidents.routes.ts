import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { ApiResponse, PaginationMeta } from '../../types/index.js';
import { updateIncidentRootCause } from '../../services/incident.service.js';
import { createLogger } from '../../lib/logger.js';

const router = Router();
const logger = createLogger('api', 'incidents-routes');

// Validation Schemas
const ListIncidentsSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const UpdateIncidentSchema = z.object({
  rootCause: z.string().max(1000).optional(),
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

async function verifyIncidentOwnership(incidentId: string, userId: string) {
  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      deletedAt: null,
      monitor: {
        userId,
      },
    },
    include: {
      monitor: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!incident) {
    throw new NotFoundError('Incident not found');
  }

  if (incident.monitor.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return incident;
}

// Routes
router.get('/:id/incidents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate query parameters
    const query = ListIncidentsSchema.parse(req.query);

    logger.debug({ userId, monitorId: id, query }, 'Listing incidents');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    // Build where clause
    const where: any = {
      monitorId: id,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.startedAt = {};
      if (query.from) where.startedAt.gte = query.from;
      if (query.to) where.startedAt.lte = query.to;
    }

    // Get total count
    const total = await prisma.incident.count({ where });

    // Get incidents
    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    const pagination: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };

    const response: ApiResponse<typeof incidents> = {
      data: incidents,
      meta: { pagination },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error listing incidents');
    next(error);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate request body
    const data = UpdateIncidentSchema.parse(req.body);

    logger.info({ userId, incidentId: id, updates: Object.keys(data) }, 'Updating incident');

    // Verify ownership
    await verifyIncidentOwnership(id, userId);

    // Update incident
    if (data.rootCause !== undefined) {
      await updateIncidentRootCause(id, data.rootCause);
    }

    // Fetch updated incident
    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    const response: ApiResponse<typeof incident> = {
      data: incident,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error updating incident');
    next(error);
  }
});

export default router;