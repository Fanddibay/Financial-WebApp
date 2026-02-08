/**
 * Client-side encryption utilities using Web Crypto API
 * Provides AES-GCM encryption/decryption for data export/import
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const SALT_LENGTH = 16

/**
 * Derives a cryptographic key from a passphrase using PBKDF2
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypts data using AES-GCM with a passphrase
 * Returns base64-encoded string containing salt, IV, and encrypted data
 */
export async function encryptData(
  data: string,
  passphrase: string,
): Promise<string> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt)

    // Encrypt data
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      dataBytes,
    )

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength,
    )
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    throw new Error(
      `Enkripsi gagal: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`,
    )
  }
}

/**
 * Decrypts data using AES-GCM with a passphrase
 * Expects base64-encoded string containing salt, IV, and encrypted data
 */
export async function decryptData(
  encryptedData: string,
  passphrase: string,
): Promise<string> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  try {
    // Decode from base64
    const combined = Uint8Array.from(
      atob(encryptedData),
      (c) => c.charCodeAt(0),
    )

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH)
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH)

    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt)

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encrypted,
    )

    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch {
    // Generic crypto errors (e.g. "The operation failed for an operation-specific reason")
    // mean wrong passphrase or incompatible/corrupt backup; show friendly message via DECRYPT_FAILED
    throw new Error('DECRYPT_FAILED')
  }
}

