import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }

  // Derive key using scrypt
  const salt = Buffer.from('openclaw-payload-salt') // Static salt for consistency
  return scryptSync(key, salt, KEY_LENGTH)
}

/**
 * Encrypt a string value
 * Returns base64-encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  // Combine IV + encrypted + tag, then base64 encode
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), tag])

  return combined.toString('base64')
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()

  // Decode base64
  const combined = Buffer.from(ciphertext, 'base64')

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(-TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypt an object (converts to JSON first)
 */
export function encryptObject<T>(obj: T): string {
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt to an object
 */
export function decryptObject<T>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T
}

/**
 * Check if a value is encrypted (basic heuristic)
 */
export function isEncrypted(value: string): boolean {
  try {
    const buffer = Buffer.from(value, 'base64')
    return buffer.length >= IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Safely encrypt only if not already encrypted
 */
export function safeEncrypt(value: string): string {
  if (isEncrypted(value)) {
    return value
  }
  return encrypt(value)
}

/**
 * Safely decrypt only if encrypted
 */
export function safeDecrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value
  }
  return decrypt(value)
}
