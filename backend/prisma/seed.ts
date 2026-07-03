/**
 * Database seed script
 * Creates demo user, monitors, ping logs, daily stats, and incidents
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Generate realistic ping logs for a monitor over the past N days
 */
function generatePingLogs(monitorId: string, days: number, uptimePercent: number) {
  const logs = [];
  const now = new Date();
  const checksPerDay = 288; // Every 5 minutes = 12 per hour * 24 hours

  for (let day = days; day >= 0; day--) {
    for (let check = 0; check < checksPerDay; check++) {
      const checkedAt = new Date(now);
      checkedAt.setDate(checkedAt.getDate() - day);
      checkedAt.setHours(0, 0, 0, 0);
      checkedAt.setMinutes(check * 5);

      // Randomly determine if this check is up based on uptime percentage
      const isUp = Math.random() * 100 < uptimePercent;

      logs.push({
        monitorId,
        checkedAt,
        isUp,
        statusCode: isUp ? 200 : Math.random() > 0.5 ? 500 : null,
        responseTimeMs: isUp ? Math.floor(Math.random() * 300) + 50 : null,
        errorType: !isUp
          ? ['TIMEOUT', 'DNS_FAILURE', 'HTTP_ERROR', 'CONNECTION_REFUSED'][
              Math.floor(Math.random() * 4)
            ]
          : null,
        redirectCount: isUp && Math.random() > 0.9 ? 1 : 0,
        finalUrl: null,
      });
    }
  }

  return logs;
}

/**
 * Generate daily statistics from ping logs
 */
function generateDailyStats(monitorId: string, days: number, uptimePercent: number) {
  const stats = [];
  const now = new Date();
  const checksPerDay = 288;

  for (let day = days; day >= 1; day--) {
    const statDate = new Date(now);
    statDate.setDate(statDate.getDate() - day);
    statDate.setHours(0, 0, 0, 0);

    const totalChecks = checksPerDay;
    const successfulChecks = Math.floor((checksPerDay * uptimePercent) / 100);
    const actualUptimePercent = ((successfulChecks / totalChecks) * 100).toFixed(2);

    stats.push({
      monitorId,
      statDate,
      totalChecks,
      successfulChecks,
      uptimePercent: parseFloat(actualUptimePercent),
      p50Ms: Math.floor(Math.random() * 100) + 80,
      p95Ms: Math.floor(Math.random() * 200) + 150,
      p99Ms: Math.floor(Math.random() * 300) + 250,
    });
  }

  return stats;
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.notificationLog.deleteMany();
  await prisma.notificationConfig.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.sslCheck.deleteMany();
  await prisma.dailyStat.deleteMany();
  await prisma.pingLog.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.deadLetterJob.deleteMany();

  // Create demo user
  console.log('👤 Creating demo user...');
  const hashedPassword = await bcrypt.hash('demo123456', 10);
  
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@statusping.dev',
      name: 'Demo User',
      password: hashedPassword,
    },
  });
  console.log(`   ✓ Created user: ${demoUser.email}`);

  // Create monitors
  console.log('\n📡 Creating monitors...');
  
  const githubMonitor = await prisma.monitor.create({
    data: {
      userId: demoUser.id,
      name: 'GitHub',
      url: 'https://github.com',
      checkIntervalMinutes: 5,
      failureThreshold: 2,
      timeoutSeconds: 10,
      status: 'active',
      statusPageVisible: true,
      lastCheckedAt: new Date(),
    },
  });
  console.log(`   ✓ Created monitor: ${githubMonitor.name}`);

  const httpbinMonitor = await prisma.monitor.create({
    data: {
      userId: demoUser.id,
      name: 'HTTPBin API',
      url: 'https://httpbin.org/status/200',
      checkIntervalMinutes: 5,
      failureThreshold: 2,
      timeoutSeconds: 10,
      status: 'active',
      statusPageVisible: true,
      lastCheckedAt: new Date(),
    },
  });
  console.log(`   ✓ Created monitor: ${httpbinMonitor.name}`);

  const failingMonitor = await prisma.monitor.create({
    data: {
      userId: demoUser.id,
      name: 'Failing Service',
      url: 'https://httpbin.org/status/503',
      checkIntervalMinutes: 15,
      failureThreshold: 2,
      timeoutSeconds: 10,
      status: 'down',
      statusPageVisible: true,
      consecutiveFailures: 5,
      lastCheckedAt: new Date(),
    },
  });
  console.log(`   ✓ Created monitor: ${failingMonitor.name}`);

  // Generate ping logs for the past 30 days
  console.log('\n📊 Generating ping logs (this may take a moment)...');
  
  const githubLogs = generatePingLogs(githubMonitor.id, 30, 99.8);
  const httpbinLogs = generatePingLogs(httpbinMonitor.id, 30, 98.5);
  const failingLogs = generatePingLogs(failingMonitor.id, 30, 75.0);

  // Insert in batches to avoid memory issues
  const batchSize = 1000;
  let totalInserted = 0;

  for (const logs of [githubLogs, httpbinLogs, failingLogs]) {
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      await prisma.pingLog.createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += batch.length;
    }
  }
  console.log(`   ✓ Created ${totalInserted} ping logs`);

  // Generate daily statistics
  console.log('\n📈 Generating daily statistics...');
  
  const githubStats = generateDailyStats(githubMonitor.id, 30, 99.8);
  const httpbinStats = generateDailyStats(httpbinMonitor.id, 30, 98.5);
  const failingStats = generateDailyStats(failingMonitor.id, 30, 75.0);

  await prisma.dailyStat.createMany({
    data: [...githubStats, ...httpbinStats, ...failingStats],
    skipDuplicates: true,
  });
  console.log(`   ✓ Created ${githubStats.length + httpbinStats.length + failingStats.length} daily stats`);

  // Create incidents
  console.log('\n🚨 Creating incidents...');
  
  // Resolved incident for HTTPBin (happened 5 days ago, lasted 45 minutes)
  const resolvedIncidentStart = new Date();
  resolvedIncidentStart.setDate(resolvedIncidentStart.getDate() - 5);
  resolvedIncidentStart.setHours(14, 30, 0, 0);
  
  const resolvedIncidentEnd = new Date(resolvedIncidentStart);
  resolvedIncidentEnd.setMinutes(resolvedIncidentEnd.getMinutes() + 45);

  const resolvedIncident = await prisma.incident.create({
    data: {
      monitorId: httpbinMonitor.id,
      status: 'resolved',
      startedAt: resolvedIncidentStart,
      resolvedAt: resolvedIncidentEnd,
      durationSeconds: 45 * 60, // 45 minutes
      errorType: 'HTTP_ERROR',
      rootCause: 'Scheduled maintenance window',
    },
  });
  console.log(`   ✓ Created resolved incident for ${httpbinMonitor.name}`);

  // Open incident for failing monitor (started 2 hours ago)
  const openIncidentStart = new Date();
  openIncidentStart.setHours(openIncidentStart.getHours() - 2);

  const openIncident = await prisma.incident.create({
    data: {
      monitorId: failingMonitor.id,
      status: 'open',
      startedAt: openIncidentStart,
      errorType: 'HTTP_ERROR',
    },
  });
  console.log(`   ✓ Created open incident for ${failingMonitor.name}`);

  // Create notification configs
  console.log('\n📧 Creating notification configurations...');
  
  const emailNotification = await prisma.notificationConfig.create({
    data: {
      monitorId: githubMonitor.id,
      userId: demoUser.id,
      type: 'email',
      email: demoUser.email,
      onIncidentOpen: true,
      onIncidentResolve: true,
    },
  });
  console.log(`   ✓ Created email notification for ${githubMonitor.name}`);

  // Create notification logs for the resolved incident
  console.log('\n📬 Creating notification logs...');
  
  await prisma.notificationLog.create({
    data: {
      notificationConfigId: emailNotification.id,
      incidentId: resolvedIncident.id,
      eventType: 'opened',
      status: 'delivered',
      attempts: 1,
      lastAttemptAt: resolvedIncidentStart,
      deliveredAt: resolvedIncidentStart,
    },
  });

  await prisma.notificationLog.create({
    data: {
      notificationConfigId: emailNotification.id,
      incidentId: resolvedIncident.id,
      eventType: 'resolved',
      status: 'delivered',
      attempts: 1,
      lastAttemptAt: resolvedIncidentEnd,
      deliveredAt: resolvedIncidentEnd,
    },
  });
  console.log(`   ✓ Created notification logs`);

  // Create SSL checks for HTTPS monitors
  console.log('\n🔒 Creating SSL checks...');
  
  const sslExpiresAt = new Date();
  sslExpiresAt.setDate(sslExpiresAt.getDate() + 90);

  for (const monitor of [githubMonitor, httpbinMonitor]) {
    await prisma.sslCheck.create({
      data: {
        monitorId: monitor.id,
        checkedAt: new Date(),
        expiresAt: sslExpiresAt,
        daysRemaining: 90,
        issuer: 'DigiCert Inc',
        isValid: true,
      },
    });
    console.log(`   ✓ Created SSL check for ${monitor.name}`);
  }

  console.log('\n✅ Database seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   • Users: 1`);
  console.log(`   • Monitors: 3`);
  console.log(`   • Ping Logs: ${totalInserted}`);
  console.log(`   • Daily Stats: ${githubStats.length + httpbinStats.length + failingStats.length}`);
  console.log(`   • Incidents: 2 (1 open, 1 resolved)`);
  console.log(`   • Notification Configs: 1`);
  console.log(`   • Notification Logs: 2`);
  console.log(`   • SSL Checks: 2`);
  console.log('\n🔐 Demo credentials:');
  console.log(`   Email: demo@statusping.dev`);
  console.log(`   Password: demo123456\n`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });