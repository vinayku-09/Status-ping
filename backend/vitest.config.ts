import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/statusping_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      JWT_EXPIRES_IN: '7d',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '587',
      SMTP_USER: 'test',
      SMTP_PASS: 'test',
      SMTP_FROM: 'test@example.com',
      WEBHOOK_ENCRYPTION_KEY: 'test-webhook-encryption-key-at-least-32-chars',
      APP_URL: 'http://localhost:3000',
      PING_WORKER_CONCURRENCY: '10',
      NOTIFICATION_COOLDOWN_SECONDS: '1800',
      PING_LOG_RETENTION_DAYS: '30',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/services/**', 'src/lib/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
  },
});