/**
 * Cryptographic utilities tests
 */

import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, computeHmac, generateWebhookSecret } from '../../src/lib/crypto.js';

describe('crypto helpers', () => {
  describe('encrypt and decrypt', () => {
    it('are inverse operations', () => {
      const plaintext = 'my-super-secret-webhook-key';
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('produce different ciphertexts for same input (random IV)', () => {
      const plaintext = 'test-secret';
      const encrypted1 = encryptSecret(plaintext);
      const encrypted2 = encryptSecret(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handle long secrets', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-={}[]|:";\'<>?,./';
      const encrypted = encryptSecret(plaintext);
      const decrypted = decryptSecret(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('throw error for invalid encrypted data format', () => {
      expect(() => decryptSecret('invalid')).toThrow();
    });

    it('throw error for corrupted encrypted data', () => {
      const plaintext = 'test';
      const encrypted = encryptSecret(plaintext);
      const corrupted = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
      expect(() => decryptSecret(corrupted)).toThrow();
    });
  });

  describe('computeHmac', () => {
    it('returns consistent result for same input', () => {
      const secret = 'my-secret';
      const payload = '{"event":"opened"}';
      const hmac1 = computeHmac(secret, payload);
      const hmac2 = computeHmac(secret, payload);
      expect(hmac1).toBe(hmac2);
    });

    it('returns different result for different secret', () => {
      const payload = '{"event":"opened"}';
      const hmac1 = computeHmac('secret1', payload);
      const hmac2 = computeHmac('secret2', payload);
      expect(hmac1).not.toBe(hmac2);
    });

    it('returns different result for different payload', () => {
      const secret = 'my-secret';
      const hmac1 = computeHmac(secret, '{"event":"opened"}');
      const hmac2 = computeHmac(secret, '{"event":"resolved"}');
      expect(hmac1).not.toBe(hmac2);
    });

    it('returns hex string', () => {
      const hmac = computeHmac('secret', 'payload');
      expect(hmac).toMatch(/^[a-f0-9]+$/);
      expect(hmac.length).toBe(64); // SHA-256 produces 64 hex characters
    });
  });

  describe('generateWebhookSecret', () => {
    it('generates 64-character hex string by default', () => {
      const secret = generateWebhookSecret();
      expect(secret).toMatch(/^[a-f0-9]+$/);
      expect(secret.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('generates different secrets each time', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('respects custom length', () => {
      const secret = generateWebhookSecret(16);
      expect(secret.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });
});