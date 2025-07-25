import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Encrypts a string using AES-256-GCM encryption
 * @param text - The string to encrypt
 * @returns Encrypted string in format: iv:tag:encryptedData (base64 encoded)
 */
export function encryptString(text: string): Result<string, string> {
    try {
        if (!config.encryptionKey) {
            return Err('Encryption key not configured');
        }

        const iv = crypto.randomBytes(IV_LENGTH);
        const key = Buffer.from(config.encryptionKey, 'base64');

        if (key.length !== KEY_LENGTH) {
            return Err('Invalid encryption key length');
        }

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('hypersigil'));

        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const tag = cipher.getAuthTag();

        // Combine iv, tag, and encrypted data
        const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;

        return Ok(result);
    } catch (error) {
        return Err(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Decrypts a string that was encrypted with encryptString
 * @param encryptedText - The encrypted string in format: iv:tag:encryptedData
 * @returns Decrypted string
 */
export function decryptString(encryptedText: string): Result<string, string> {
    try {
        if (!config.encryptionKey) {
            return Err('Encryption key not configured');
        }

        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            return Err('Invalid encrypted text format');
        }

        const [ivBase64, tagBase64, encrypted] = parts;

        if (!ivBase64 || !tagBase64 || !encrypted) {
            return Err('Invalid encrypted text format - missing parts');
        }

        const iv = Buffer.from(ivBase64, 'base64');
        const tag = Buffer.from(tagBase64, 'base64');
        const key = Buffer.from(config.encryptionKey!, 'base64');

        if (key.length !== KEY_LENGTH) {
            return Err('Invalid encryption key length');
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.from('hypersigil'));

        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return Ok(decrypted);
    } catch (error) {
        return Err(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates a random encryption key suitable for AES-256
 * @returns Base64 encoded encryption key
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
}
