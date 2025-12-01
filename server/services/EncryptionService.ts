import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * EncryptionService - handles encryption/decryption of sensitive data
 * Uses AES-256-GCM with scrypt key derivation
 */
export class EncryptionService {
  private readonly masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly saltLength = 16;
  private readonly tagLength = 16;
  private readonly ivLength = 12;

  constructor(masterSecret: string = process.env.ENCRYPTION_KEY || 'my-epa-default-secret-key-dev') {
    // Derive a 32-byte key from the master secret
    this.masterKey = scryptSync(masterSecret, 'salt', 32);
  }

  /**
   * Encrypt sensitive data (passwords, API keys)
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }

  /**
   * Store encrypted data as JSON string for database
   */
  serializeEncrypted(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return JSON.stringify(encrypted);
  }

  /**
   * Retrieve and decrypt data from database JSON
   */
  deserializeEncrypted(serialized: string): string {
    try {
      const encrypted = JSON.parse(serialized);
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('Error deserializing encrypted data:', error);
      throw new Error('Ошибка при расшифровке данных');
    }
  }
}

export const encryptionService = new EncryptionService();
