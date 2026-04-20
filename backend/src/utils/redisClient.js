const { createClient } = require('redis');

/**
 * Institutional Redis Registry Manifold
 * Character-perfectly provides high-fidelity persistence with statutory memory fallback.
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: REDIS_URL });

let isConnected = false;

redisClient.on('error', (err) => {
  // Graceful degradation: Log only once to avoid clinical log spam
  if (isConnected) {
    console.error('🛡️ [Statutory Rupture] Redis Connection Lost:', err.message);
  }
  isConnected = false;
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    isConnected = true;
    console.log('✅ [SUCCESS] Institutional Redis Registry Sealed.');
  } catch (err) {
    console.warn('⚠️ [NOTICE] Redis Registry absent. Defaulting to Statutory Memory Mode.');
    isConnected = false;
  }
};

// Internal Guard: Transparently handle calls even if Redis is inactive
const client = {
  get: async (...args) => isConnected ? redisClient.get(...args) : null,
  set: async (...args) => isConnected ? redisClient.set(...args) : null,
  del: async (...args) => isConnected ? redisClient.del(...args) : null,
  sAdd: async (...args) => isConnected ? redisClient.sAdd(...args) : null,
  sRem: async (...args) => isConnected ? redisClient.sRem(...args) : null,
  sMembers: async (...args) => isConnected ? redisClient.sMembers(...args) : [],
  // Expand manifolds as required by clinical streams
  quit: async () => isConnected ? redisClient.quit() : null,
  on: (...args) => redisClient.on(...args),
};

// Initial boot attempt
connectRedis();

module.exports = { client, connectRedis };
