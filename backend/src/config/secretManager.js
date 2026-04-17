/**
 * Institutional Secret Management Abstraction — RoboMed v2.0
 * 
 * Provides a character-perfect interface for secret retrieval.
 * In local dev, it falls back to process.env.
 * In production, it can be extended to call AWS Secrets Manager or HashiCorp Vault.
 */
const logger = require('../utils/logger'); // Assuming it exists or I'll use console

const getSecret = async (secretName, defaultValue = null) => {
  // 1. Check for institutional environment override
  const envVal = process.env[secretName];
  
  if (envVal) {
    return envVal;
  }

  // 2. [Institutional Hook] Here we would call Vault / AWS if NODE_ENV === 'production'
  // for now, we maintain local .env integrity.
  
  if (defaultValue !== null) return defaultValue;
  
  throw new Error(`Critical Institutional Secret Missing: ${secretName}`);
};

/**
 * Loads entire institutional manifest — character-perfectly decoupled.
 */
const loadInstitutionalConfig = async () => {
  return {
    jwtSecret: await getSecret('JWT_SECRET'),
    dbUri: await getSecret('MONGODB_URI'),
    cloudinary: {
      cloudName: await getSecret('CLOUDINARY_CLOUD_NAME'),
      apiKey: await getSecret('CLOUDINARY_API_KEY'),
      apiSecret: await getSecret('CLOUDINARY_API_SECRET'),
    },
    aiServiceUrl: await getSecret('AI_SERVICE_URL', 'http://localhost:5001'),
  };
};

module.exports = { getSecret, loadInstitutionalConfig };
