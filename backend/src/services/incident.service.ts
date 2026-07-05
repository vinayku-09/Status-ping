import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'incident-service');


// Action taken by incident evaluation

export type IncidentAction =
  | { action: 'none' }
  | { action: 'created'; incidentId: string }
  | { action: 'resolved'; incidentId: string }
  | { action: 'duplicate' };


export async function evaluateIncident(
  monitorId: string,
  isUp: boolean
): Promise<IncidentAction> {
  logger.debug({ monitorId, isUp }, 'Evaluating incident');

  try {
    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Fetch the monitor
      const monitor = await tx.monitor.findUnique({
        where: { id: monitorId },
        select: {
          id: true,
          userId: true,
          name: true,
          consecutiveFailures: true,
          failureThreshold: true,
          status: true,
          deletedAt: true,
        },
      });

      if (!monitor || monitor.deletedAt) {
        logger.warn({ monitorId }, 'Monitor not found or deleted, skipping incident evaluation');
        return { action: 'none' };
      }

      // RECOVERY PATH (isUp = true)
      
      if (isUp) {
        logger.debug(
          { monitorId, consecutiveFailures: monitor.consecutiveFailures },
          'Monitor is up, checking for recovery'
        );

        // Reset consecutive failures
        await tx.monitor.update({
          where: { id: monitorId },
          data: {
            consecutiveFailures: 0,
            status: 'active',
          },
        });

        // Look for open incident
        const openIncident = await tx.incident.findFirst({
          where: {
            monitorId,
            status: 'open',
            deletedAt: null,
          },
        });

        if (openIncident) {
          // Resolve the incident
          const resolvedAt = new Date();
          const durationSeconds = Math.floor(
            (resolvedAt.getTime() - openIncident.startedAt.getTime()) / 1000
          );

          await tx.incident.update({
            where: { id: openIncident.id },
            data: {
              status: 'resolved',
              resolvedAt,
              durationSeconds,
            },
          });

          logger.info(
            { monitorId, incidentId: openIncident.id, durationSeconds },
            'Incident resolved'
          );

          return { action: 'resolved', incidentId: openIncident.id };
        }

        logger.debug({ monitorId }, 'Monitor recovered but no open incident found');
        return { action: 'none' };
      }

      // FAILURE PATH (isUp = false) 
      logger.debug(
        { monitorId, consecutiveFailures: monitor.consecutiveFailures },
        'Monitor is down, incrementing failure count'
      );

      // Increment consecutive failures
      const newConsecutiveFailures = monitor.consecutiveFailures + 1;

      await tx.monitor.update({
        where: { id: monitorId },
        data: {
          consecutiveFailures: newConsecutiveFailures,
          status: 'down',
        },
      });

      // Check if threshold is reached
      if (newConsecutiveFailures < monitor.failureThreshold) {
        logger.debug(
          {
            monitorId,
            consecutiveFailures: newConsecutiveFailures,
            threshold: monitor.failureThreshold,
          },
          'Failure threshold not reached yet'
        );
        return { action: 'none' };
      }

      // Threshold reached - attempt to create incident
      logger.info(
        {
          monitorId,
          consecutiveFailures: newConsecutiveFailures,
          threshold: monitor.failureThreshold,
        },
        'Failure threshold reached, creating incident'
      );

      try {
        // Get the most recent ping log to extract error details
        const recentPingLog = await tx.pingLog.findFirst({
          where: { monitorId },
          orderBy: { checkedAt: 'desc' },
          select: { errorType: true },
        });

        const incident = await tx.incident.create({
          data: {
            monitorId,
            status: 'open',
            startedAt: new Date(),
            errorType: recentPingLog?.errorType || null,
          },
        });

        logger.info({ monitorId, incidentId: incident.id }, 'Incident created');
        return { action: 'created', incidentId: incident.id };
      } catch (error) {
        // Handle unique constraint violation (duplicate open incident)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            logger.info({ monitorId }, 'Incident already exists (duplicate)');
            return { action: 'duplicate' };
          }
        }
        throw error;
      }
    });
  } catch (error) {
    logger.error({ err: error, monitorId }, 'Error evaluating incident');
    throw error;
  }
}

export async function getOpenIncident(monitorId: string) {
  try {
    return await prisma.incident.findFirst({
      where: {
        monitorId,
        status: 'open',
        deletedAt: null,
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            userId: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, monitorId }, 'Error fetching open incident');
    throw error;
  }
}

export async function getIncidentById(incidentId: string) {
  try {
    return await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            userId: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, incidentId }, 'Error fetching incident');
    throw error;
  }
}

export async function updateIncidentRootCause(
  incidentId: string,
  rootCause: string
): Promise<void> {
  try {
    await prisma.incident.update({
      where: { id: incidentId },
      data: { rootCause },
    });

    logger.info({ incidentId }, 'Incident root cause updated');
  } catch (error) {
    logger.error({ err: error, incidentId }, 'Error updating incident root cause');
    throw error;
  }
}

export async function getIncidentStats(monitorId: string, daysBack: number = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const [totalIncidents, resolvedIncidents, openIncidents] = await Promise.all([
      prisma.incident.count({
        where: {
          monitorId,
          startedAt: { gte: since },
          deletedAt: null,
        },
      }),
      prisma.incident.count({
        where: {
          monitorId,
          status: 'resolved',
          startedAt: { gte: since },
          deletedAt: null,
        },
      }),
      prisma.incident.count({
        where: {
          monitorId,
          status: 'open',
          deletedAt: null,
        },
      }),
    ]);

    // Calculate average resolution time
    const resolvedIncidentsData = await prisma.incident.findMany({
      where: {
        monitorId,
        status: 'resolved',
        startedAt: { gte: since },
        deletedAt: null,
      },
      select: {
        durationSeconds: true,
      },
    });

    const avgResolutionSeconds =
      resolvedIncidentsData.length > 0
        ? Math.floor(
            resolvedIncidentsData.reduce((sum, inc) => sum + (inc.durationSeconds || 0), 0) /
              resolvedIncidentsData.length
          )
        : null;

    return {
      totalIncidents,
      resolvedIncidents,
      openIncidents,
      avgResolutionSeconds,
    };
  } catch (error) {
    logger.error({ err: error, monitorId }, 'Error fetching incident stats');
    throw error;
  }
}