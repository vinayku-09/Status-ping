/**
 * Environment variable validation and typed configuration
 * This file validates all required environment variables on startup
 * and exports a fully typed env object
 */

import { z } from 'zod';

/**
 * Zod schema for environment variable validation
 * The app will crash on startup if any required variable is missing or invalid
 */
const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Email (Nodemailer SMTP)
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  SMTP_FROM: z.string().email('SMTP_FROM must be a valid email address'),

  // Webhooks
  WEBHOOK_ENCRYPTION_KEY: z.string().min(32, 'WEBHOOK_ENCRYPTION_KEY must be at least 32 characters'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_URL: z.string().url('APP_URL must be a valid URL'),

  // Worker settings
  PING_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(10),
  NOTIFICATION_COOLDOWN_SECONDS: z.coerce.number().int().min(60).default(1800),
  PING_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * Parsed and validated environment variables
 * @throws {ZodError} If validation fails, the error is logged and the process exits
 */
export type Env = z.infer<typeof EnvSchema>;

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    console.error(JSON.stringify(error.format(), null, 2));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  throw error;
}

export { env };