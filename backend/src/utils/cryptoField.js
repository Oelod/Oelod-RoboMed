const crypto = require('crypto');

/**
 * Institutional Field-Level Encryption Manifold (L3-Industrial)
 * Uses AES-256-GCM for absolute clinical privacy.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Institutional Secret Gate
const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || 'robomed-industrial-default-secret-32ch';

/**
 * Encrypts a clinical datastream.
 * Returns: iv:tag:content
 */
const encrypt = (text) => {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Industrial Formatting: iv:tag:content
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an institutional ciphertext.
 */
const decrypt = (ciphertext) => {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext;
  
  try {
    const [ivHex, tagHex, contentHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, it might be clear-text from a legacy migration or invalid key
    console.warn('🛡️ [Statutory Warning] Field decryption failure (Record may be clear-text or corrupted)');
    return ciphertext;
  }
};

module.exports = { encrypt, decrypt };
