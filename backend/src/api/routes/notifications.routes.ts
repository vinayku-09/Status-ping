import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { ApiResponse } from '../../types/index.js';
import { encryptSecret, generateWebhookSecret } from '../../lib/crypto.js';
import { createLogger } from '../../lib/logger.js';

const router = Router();
const logger = createLogger('api', 'notifications-routes');

// Validation Schemas
const CreateNotificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    email: z.string().email(),
    onIncidentOpen: z.boolean().default(true),
    onIncidentResolve: z.boolean().default(true),
  }),
  z.object({
    type: z.literal('webhook'),
    webhookUrl: z.string().url().startsWith('https://'),
    onIncidentOpen: z.boolean().default(true),
    onIncidentResolve: z.boolean().default(true),
  }),
]);

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

async function verifyNotificationConfigOwnership(configId: string, userId: string) {
  const config = await prisma.notificationConfig.findFirst({
    where: {
      id: configId,
      deletedAt: null,
      monitor: {
        userId,
      },
    },
    include: {
      monitor: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!config) {
    throw new NotFoundError('Notification configuration not found');
  }

  if (config.monitor.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  return config;
}

// Routes
router.get('/:id/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    logger.debug({ userId, monitorId: id }, 'Listing notification configs');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    // Get notification configs (exclude encrypted secret)
    const configs = await prisma.notificationConfig.findMany({
      where: {
        monitorId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        monitorId: true,
        userId: true,
        type: true,
        email: true,
        webhookUrl: true,
        // Explicitly exclude webhookSecretEnc
        onIncidentOpen: true,
        onIncidentResolve: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse<typeof configs> = {
      data: configs,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error listing notification configs');
    next(error);
  }
});

router.post('/:id/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const userId = authReq.user.id;
    const { id } = req.params;

    // Validate request body
    const data = CreateNotificationSchema.parse(req.body);

    logger.info({ userId, monitorId: id, type: data.type }, 'Creating notification config');

    // Verify ownership
    await verifyMonitorOwnership(id, userId);

    let config;
    let webhookSecret: string | null = null;

    if (data.type === 'email') {
      // Create email notification
      config = await prisma.notificationConfig.create({
        data: {
          monitorId: id,
          userId,
          type: 'email',
          email: data.email,
          onIncidentOpen: data.onIncidentOpen,
          onIncidentResolve: data.onIncidentResolve,
        },
        select: {
          id: true,
          monitorId: true,
          userId: true,
          type: true,
          email: true,
          onIncidentOpen: true,
          onIncidentResolve: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info({ userId, configId: config.id }, 'Email notification created');

      const response: ApiResponse<typeof config> = {
        data: config,
      };

      return res.status(201).json(response);
    } else {
      // Generate and encrypt webhook secret
      webhookSecret = generateWebhookSecret();
      const encryptedSecret = encryptSecret(webhookSecret);

      // Create webhook notification
      config = await prisma.notificationConfig.create({
        data: {
          monitorId: id,
          userId,
          type: 'webhook',
          webhookUrl: data.webhookUrl,
          webhookSecretEnc: encryptedSecret,
          onIncidentOpen: data.onIncidentOpen,
          onIncidentResolve: data.onIncidentResolve,
        },
        select: {
          id: true,
          monitorId: true,
          userId: true,
          type: true,
          webhookUrl: true,
          onIncidentOpen: true,
          onIncidentResolve: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info({ userId, configId: config.id }, 'Webhook notification created');

      // Return config with plaintext webhook secret (ONLY TIME IT'S SHOWN)
      const response: ApiResponse<typeof config> = {
        data: config,
        meta: {
          webhookSecret,
          note: 'Store this webhook secret securely. It will not be shown again.',
        },
      };

      return res.status(201).json(response);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error creating notification config');
    next(error);
  }
});

router.delete(
  '/:id/notifications/:configId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as any;
      const userId = authReq.user.id;
      const { id, configId } = req.params;

      logger.info({ userId, monitorId: id, configId }, 'Deleting notification config');

      // Verify monitor ownership
      await verifyMonitorOwnership(id, userId);

      // Verify config ownership and that it belongs to this monitor
      const config = await verifyNotificationConfigOwnership(configId, userId);

      if (config.monitorId !== id) {
        throw new ForbiddenError('Notification configuration does not belong to this monitor');
      }

      // Soft delete
      await prisma.notificationConfig.update({
        where: { id: configId },
        data: { deletedAt: new Date() },
      });

      logger.info({ userId, configId }, 'Notification config deleted');

      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, 'Error deleting notification config');
      next(error);
    }
  }
);

export default router;