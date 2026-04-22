const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

// Institutional secret — MUST be in .env in production
const SECRET = process.env.DATABASE_ENCRYPTION_KEY || 'robomed_statutory_secret_32_chars_!!';

/**
 * Institutional Crypto Engine — Provides high-fidelity AES-256-GCM encryption
 * for sensitive PHI (Protected Health Information) fields.
 */

function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext) {
    if (!ciphertext) return ciphertext;
    const bData = Buffer.from(ciphertext, 'base64');
    
    const salt = bData.subarray(0, SALT_LENGTH);
    const iv = bData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = bData.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
    const encrypted = bData.subarray(SALT_LENGTH + IV_LENGTH + 16);
    
    const key = crypto.pbkdf2Sync(SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, 'binary', 'utf8') + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
