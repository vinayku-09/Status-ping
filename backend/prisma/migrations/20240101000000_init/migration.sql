-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" TEXT NOT NULL,
    "checkIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "failureThreshold" INTEGER NOT NULL DEFAULT 2,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 10,
    "keywordCheck" VARCHAR(200),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "statusPageVisible" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PingLog" (
    "id" SERIAL NOT NULL,
    "monitorId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isUp" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "errorType" TEXT,
    "redirectCount" INTEGER NOT NULL DEFAULT 0,
    "finalUrl" TEXT,

    CONSTRAINT "PingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" SERIAL NOT NULL,
    "monitorId" TEXT NOT NULL,
    "statDate" DATE NOT NULL,
    "totalChecks" INTEGER NOT NULL DEFAULT 0,
    "successfulChecks" INTEGER NOT NULL DEFAULT 0,
    "uptimePercent" DECIMAL(5,2),
    "p50Ms" INTEGER,
    "p95Ms" INTEGER,
    "p99Ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "rootCause" TEXT,
    "errorType" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT,
    "webhookUrl" TEXT,
    "webhookSecretEnc" TEXT,
    "onIncidentOpen" BOOLEAN NOT NULL DEFAULT true,
    "onIncidentResolve" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" SERIAL NOT NULL,
    "notificationConfigId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SslCheck" (
    "id" SERIAL NOT NULL,
    "monitorId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "daysRemaining" INTEGER,
    "issuer" VARCHAR(255),
    "isValid" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "SslCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterJob" (
    "id" SERIAL NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT,
    "jobData" JSONB NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replayedAt" TIMESTAMP(3),

    CONSTRAINT "DeadLetterJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Monitor_userId_deletedAt_idx" ON "Monitor"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Monitor_status_deletedAt_idx" ON "Monitor"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Monitor_lastCheckedAt_idx" ON "Monitor"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "PingLog_monitorId_checkedAt_idx" ON "PingLog"("monitorId", "checkedAt" DESC);

-- CreateIndex
CREATE INDEX "PingLog_checkedAt_idx" ON "PingLog"("checkedAt");

-- CreateIndex
CREATE INDEX "DailyStat_statDate_idx" ON "DailyStat"("statDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_monitorId_statDate_key" ON "DailyStat"("monitorId", "statDate");

-- CreateIndex
CREATE INDEX "Incident_monitorId_status_deletedAt_idx" ON "Incident"("monitorId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "Incident_status_startedAt_idx" ON "Incident"("status", "startedAt");

-- CreateIndex
CREATE INDEX "NotificationConfig_monitorId_deletedAt_idx" ON "NotificationConfig"("monitorId", "deletedAt");

-- CreateIndex
CREATE INDEX "NotificationLog_notificationConfigId_createdAt_idx" ON "NotificationLog"("notificationConfigId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_incidentId_idx" ON "NotificationLog"("incidentId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SslCheck_monitorId_checkedAt_idx" ON "SslCheck"("monitorId", "checkedAt" DESC);

-- CreateIndex
CREATE INDEX "DeadLetterJob_queueName_failedAt_idx" ON "DeadLetterJob"("queueName", "failedAt");

-- CreateIndex
CREATE INDEX "DeadLetterJob_replayedAt_idx" ON "DeadLetterJob"("replayedAt");

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PingLog" ADD CONSTRAINT "PingLog_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_notificationConfigId_fkey" FOREIGN KEY ("notificationConfigId") REFERENCES "NotificationConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SslCheck" ADD CONSTRAINT "SslCheck_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
