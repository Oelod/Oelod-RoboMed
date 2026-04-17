const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ── Cache the MongoDB binary inside the project so it never re-downloads ──────
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../../.mongoms');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_32chars_minimum!!';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32chars_min!!';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.AI_SERVICE_URL = 'http://localhost:5001';
  global.__MONGOD__ = mongod;
};

