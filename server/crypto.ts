import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

let derivedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (derivedKey) return derivedKey;

  const rawKey = process.env.ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_SECRET;
  if (!rawKey || rawKey.trim().length < 32) {
    throw new Error(
      'FATAL: ENCRYPTION_KEY environment variable is missing or too short (min 32 chars). ' +
      'Set a strong random ENCRYPTION_KEY before starting the server.'
    );
  }
  const salt = process.env.ENCRYPTION_SALT;
  if (!salt || salt.length < 16) {
    throw new Error('FATAL: ENCRYPTION_SALT must be a stable random value of at least 16 characters.');
  }
  derivedKey = crypto.scryptSync(rawKey.trim(), salt, 32);

  return derivedKey;
}

/**
 * Encrypts a sensitive OAuth token using AES-256-GCM.
 * Output format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    // Not in expected format, return empty
    return '';
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
