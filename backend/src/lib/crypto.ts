/**
 * Cryptographic utilities
 * Encryption, decryption, and HMAC signing for webhook secrets
 */

import crypto from 'crypto';
import { env } from '../config/env.js';


// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';

// IV length for AES-256-GCM (12 bytes recommended)
const IV_LENGTH = 12;

// Auth tag length for AES-256-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from the encryption key env var
 * Uses SHA-256 to ensure consistent length
 */
function deriveKey(): Buffer {
  return crypto.createHash('sha256').update(env.WEBHOOK_ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a plaintext secret for storage
 * Uses AES-256-GCM with random IV
 * 
 * @param plaintext - Secret to encrypt
 * @returns Base64-encoded string in format: {iv}:{authTag}:{ciphertext}
 * 
 * @example
 * const encrypted = encryptSecret('my-webhook-secret');
 * // Returns: "4k2l3j4h5k6l:9m8n7b6v5c4x:a1s2d3f4g5h6..."
 */
export function encryptSecret(plaintext: string): string {
  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return as colon-separated base64 strings
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a stored encrypted secret
 * 
 * @param ciphertext - Encrypted string in format: {iv}:{authTag}:{ciphertext}
 * @returns Decrypted plaintext secret
 * @throws Error if decryption fails (wrong key, corrupted data, etc.)
 * 
 * @example
 * const decrypted = decryptSecret(encrypted);
 * // Returns: "my-webhook-secret"
 */
export function decryptSecret(ciphertext: string): string {
  try {
    // Parse the encrypted string
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivBase64, authTagBase64, encryptedBase64] = parts;

    // Decode from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compute HMAC-SHA256 signature for webhook payloads
 * 
 * @param secret - Webhook secret
 * @param payload - Payload to sign (JSON string)
 * @returns Hex-encoded HMAC signature
 * 
 * @example
 * const signature = computeHmac('secret', '{"event":"opened"}');
 * // Returns: "a3b5c7d9e1f2..."
 */
export function computeHmac(secret: string, payload: string): string {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  } catch (error) {
    throw new Error(`HMAC computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify HMAC signature for incoming webhooks
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param secret - Webhook secret
 * @param payload - Payload that was signed
 * @param signature - Signature to verify
 * @returns True if signature is valid
 */
export function verifyHmac(secret: string, payload: string, signature: string): boolean {
  try {
    const expectedSignature = computeHmac(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Generate a random webhook secret
 * @param length - Length in bytes (default 32)
 * @returns Hex-encoded random secret
 */
export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}