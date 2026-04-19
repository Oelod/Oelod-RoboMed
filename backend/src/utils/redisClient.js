const { createClient } = require('redis');

/**
 * Institutional Redis Registry Manifold
 * Singleton instance for high-fidelity clinical persistence.
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: REDIS_URL });

client.on('error', (err) => console.error('🛡️ [Statutory Rupture] Redis Connection Error:', err));

let isConnected = false;

const connectRedis = async () => {
  if (isConnected) return;
  try {
    await client.connect();
    isConnected = true;
    console.log('✅ [SUCCESS] Institutional Redis Registry Sealed.');
  } catch (err) {
    console.error('❌ [FAILURE] Failed to seal Redis Registry:', err.message);
  }
};

// Initial boot attempt
connectRedis();

module.exports = { client, connectRedis };
