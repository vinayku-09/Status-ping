import nodemailer from 'nodemailer';
import { NotificationConfig, Incident, Monitor } from '@prisma/client';
import { env } from '../config/env.js';
import { decryptSecret, computeHmac } from '../lib/crypto.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'notification-service');

// Incident with monitor data for notifications

type IncidentWithMonitor = Incident & {
  monitor: Pick<Monitor, 'id' | 'name' | 'url' | 'userId'>;
};

/**
 * Create SMTP transporter (singleton)
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, 'SMTP transporter created');
  }

  return transporter;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

function buildEmailTemplate(
  incident: IncidentWithMonitor,
  eventType: 'opened' | 'resolved'
): string {
  const isOpened = eventType === 'opened';
  const emoji = isOpened ? '🔴' : '🟢';
  const status = isOpened ? 'DOWN' : 'RECOVERED';
  const color = isOpened ? '#ef4444' : '#22c55e';

  let body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${emoji} Monitor ${status}</h1>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="margin-top: 0; color: #111827;">${incident.monitor.name}</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">URL:</td>
            <td style="padding: 8px 0; color: #111827;">${incident.monitor.url}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Status:</td>
            <td style="padding: 8px 0; color: ${color}; font-weight: 600;">${status}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">${isOpened ? 'Started At:' : 'Resolved At:'}</td>
            <td style="padding: 8px 0; color: #111827;">${isOpened ? incident.startedAt.toISOString() : incident.resolvedAt?.toISOString()}</td>
          </tr>
  `;

  if (!isOpened && incident.durationSeconds) {
    body += `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Duration:</td>
            <td style="padding: 8px 0; color: #111827;">${formatDuration(incident.durationSeconds)}</td>
          </tr>
    `;
  }

  if (incident.errorType) {
    body += `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Error Type:</td>
            <td style="padding: 8px 0; color: #111827;">${incident.errorType}</td>
          </tr>
    `;
  }

  if (incident.rootCause) {
    body += `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Root Cause:</td>
            <td style="padding: 8px 0; color: #111827;">${incident.rootCause}</td>
          </tr>
    `;
  }

  body += `
        </table>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from StatusPing.</p>
          <p style="margin: 5px 0 0 0;">Incident ID: ${incident.id}</p>
        </div>
      </div>
    </div>
  `;

  return body;
}

export async function sendEmailNotification(
  config: NotificationConfig,
  incident: IncidentWithMonitor,
  eventType: 'opened' | 'resolved'
): Promise<void> {
  logger.debug(
    { configId: config.id, incidentId: incident.id, eventType },
    'Sending email notification'
  );

  if (!config.email) {
    throw new Error('Email address not configured');
  }

  try {
    const isOpened = eventType === 'opened';
    const emoji = isOpened ? '🔴' : '🟢';
    const subject = isOpened
      ? `${emoji} [StatusPing] Monitor "${incident.monitor.name}" is down`
      : `${emoji} [StatusPing] Monitor "${incident.monitor.name}" has recovered`;

    const html = buildEmailTemplate(incident, eventType);

    const mailOptions = {
      from: env.SMTP_FROM,
      to: config.email,
      subject,
      html,
    };

    const info = await getTransporter().sendMail(mailOptions);

    logger.info(
      {
        configId: config.id,
        incidentId: incident.id,
        eventType,
        to: config.email,
        messageId: info.messageId,
      },
      'Email notification sent successfully'
    );
  } catch (error) {
    logger.error(
      { err: error, configId: config.id, incidentId: incident.id, eventType },
      'Failed to send email notification'
    );
    throw error;
  }
}

function buildWebhookPayload(
  incident: IncidentWithMonitor,
  eventType: 'opened' | 'resolved'
): Record<string, unknown> {
  return {
    event: eventType,
    incident: {
      id: incident.id,
      status: incident.status,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
      durationSeconds: incident.durationSeconds,
      errorType: incident.errorType,
      rootCause: incident.rootCause,
    },
    monitor: {
      id: incident.monitor.id,
      name: incident.monitor.name,
      url: incident.monitor.url,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function sendWebhookNotification(
  config: NotificationConfig,
  incident: IncidentWithMonitor,
  eventType: 'opened' | 'resolved'
): Promise<void> {
  logger.debug(
    { configId: config.id, incidentId: incident.id, eventType },
    'Sending webhook notification'
  );

  if (!config.webhookUrl || !config.webhookSecretEnc) {
    throw new Error('Webhook URL or secret not configured');
  }

  try {
    // Decrypt the webhook secret
    const webhookSecret = decryptSecret(config.webhookSecretEnc);

    // Build payload
    const payload = buildWebhookPayload(incident, eventType);
    const payloadString = JSON.stringify(payload);

    // Compute HMAC signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `${timestamp}.${payloadString}`;
    const signature = computeHmac(webhookSecret, signaturePayload);

    // Send webhook
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-StatusPing-Signature': `sha256=${signature}`,
        'X-StatusPing-Timestamp': timestamp,
        'User-Agent': 'StatusPing-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Unable to read response');
      throw new Error(
        `Webhook returned ${response.status}: ${responseText.substring(0, 200)}`
      );
    }

    logger.info(
      {
        configId: config.id,
        incidentId: incident.id,
        eventType,
        webhookUrl: config.webhookUrl,
        statusCode: response.status,
      },
      'Webhook notification sent successfully'
    );
  } catch (error) {
    logger.error(
      { err: error, configId: config.id, incidentId: incident.id, eventType },
      'Failed to send webhook notification'
    );
    throw error;
  }
}