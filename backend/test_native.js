/**
 * Institutional Native Driver Profiler — RoboMed v2.2.2
 * Bypasses Mongoose to test native MongoDB connectivity.
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function profileNative() {
  console.log('------------------------------------------------------------');
  console.log('[DIAGNOSTIC] Initiating Native Clinical Heartbeat...');
  console.log('------------------------------------------------------------');

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('[SUCCESS] Native Institutional Connection formally verified.');
    await client.db('admin').command({ ping: 1 });
    console.log('[SUCCESS] Database Ping character-perfect.');
    process.exit(0);
  } catch (err) {
    console.error('[CRITICAL] Native Identity Rejection:');
    console.dir(err, { depth: null });
    process.exit(1);
  } finally {
    await client.close();
  }
}

profileNative();
