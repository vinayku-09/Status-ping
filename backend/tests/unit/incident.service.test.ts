/**
 * Incident service tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateIncident } from '../../src/services/incident.service.js';
import { prisma } from '../../src/config/prisma.js';
import { Prisma } from '@prisma/client';

// Mock Prisma
vi.mock('../../src/config/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    monitor: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    incident: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pingLog: {
      findFirst: vi.fn(),
    },
  },
}));

describe('evaluateIncident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns action=none when consecutiveFailures < threshold', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 1,
      failureThreshold: 2,
      status: 'active',
      deletedAt: null,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 2 }),
        },
        incident: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        pingLog: {
          findFirst: vi.fn(),
        },
      });
    });

    const result = await evaluateIncident('monitor-1', false);
    expect(result.action).toBe('none');
  });

  it('returns action=created when consecutiveFailures reaches threshold and no open incident', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 1,
      failureThreshold: 2,
      status: 'active',
      deletedAt: null,
    };

    const mockIncident = {
      id: 'incident-1',
      monitorId: 'monitor-1',
      status: 'open',
      startedAt: new Date(),
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 2 }),
        },
        incident: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockIncident),
        },
        pingLog: {
          findFirst: vi.fn().mockResolvedValue({ errorType: 'TIMEOUT' }),
        },
      });
    });

    const result = await evaluateIncident('monitor-1', false);
    expect(result.action).toBe('created');
    if (result.action === 'created') {
      expect(result.incidentId).toBe('incident-1');
    }
  });

  it('returns action=duplicate when open incident already exists (simulate P2002)', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 1,
      failureThreshold: 2,
      status: 'active',
      deletedAt: null,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 2 }),
        },
        incident: {
          findFirst: vi.fn(),
          create: vi.fn().mockRejectedValue(error),
        },
        pingLog: {
          findFirst: vi.fn().mockResolvedValue({ errorType: 'TIMEOUT' }),
        },
      });
    });

    const result = await evaluateIncident('monitor-1', false);
    expect(result.action).toBe('duplicate');
  });

  it('returns action=resolved when isUp=true and open incident exists', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 3,
      failureThreshold: 2,
      status: 'down',
      deletedAt: null,
    };

    const mockIncident = {
      id: 'incident-1',
      monitorId: 'monitor-1',
      status: 'open',
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 0, status: 'active' }),
        },
        incident: {
          findFirst: vi.fn().mockResolvedValue(mockIncident),
          update: vi.fn().mockResolvedValue({ ...mockIncident, status: 'resolved' }),
        },
      });
    });

    const result = await evaluateIncident('monitor-1', true);
    expect(result.action).toBe('resolved');
  });

  it('returns action=none when isUp=true and no open incident exists', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 1,
      failureThreshold: 2,
      status: 'active',
      deletedAt: null,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 0 }),
        },
        incident: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
    });

    const result = await evaluateIncident('monitor-1', true);
    expect(result.action).toBe('none');
  });

  it('resets consecutiveFailures to 0 on recovery', async () => {
    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 5,
      failureThreshold: 2,
      status: 'down',
      deletedAt: null,
    };

    let updatedMonitor: any = null;

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockImplementation(({ data }: any) => {
            updatedMonitor = { ...mockMonitor, ...data };
            return updatedMonitor;
          }),
        },
        incident: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
    });

    await evaluateIncident('monitor-1', true);
    expect(updatedMonitor.consecutiveFailures).toBe(0);
    expect(updatedMonitor.status).toBe('active');
  });

  it('does NOT create incident after: fail, success, fail (non-consecutive)', async () => {
    // This test demonstrates the consecutive failure logic
    // Scenario: fail (count=1), success (reset to 0), fail (count=1)
    // With threshold=2, no incident should be created

    const mockMonitor = {
      id: 'monitor-1',
      userId: 'user-1',
      name: 'Test Monitor',
      consecutiveFailures: 0,
      failureThreshold: 2,
      status: 'active',
      deletedAt: null,
    };

    // First failure
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 1 }),
        },
      });
    });

    let result = await evaluateIncident('monitor-1', false);
    expect(result.action).toBe('none');

    // Success (resets counter)
    mockMonitor.consecutiveFailures = 1;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 0, status: 'active' }),
        },
        incident: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
    });

    result = await evaluateIncident('monitor-1', true);
    expect(result.action).toBe('none');

    // Second failure (but count is now 1, not 2)
    mockMonitor.consecutiveFailures = 0;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback({
        monitor: {
          findUnique: vi.fn().mockResolvedValue(mockMonitor),
          update: vi.fn().mockResolvedValue({ ...mockMonitor, consecutiveFailures: 1 }),
        },
      });
    });

    result = await evaluateIncident('monitor-1', false);
    expect(result.action).toBe('none'); // Still not at threshold!
  });
});