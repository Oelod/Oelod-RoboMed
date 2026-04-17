const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

let redisStore = null;

if (process.env.REDIS_URL) {
  const client = createClient({ url: process.env.REDIS_URL });
  client.connect().catch(console.error);
  redisStore = new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  });
  console.log('[Scaling] Redis-backed rate limiter active.');
}

/**
 * General API rate limiter — precision-throttled.
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 5000,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore || undefined, 
  message: { success: false, message: 'Institutional Throughput Reached: Please try again later.' },
});

/**
 * Stricter limiter for high-fidelity auth endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore || undefined,
  message: { success: false, message: 'Institutional Shield Active: Too many authentication attempts.' },
});

module.exports = { apiLimiter, authLimiter };
