/**
 * Institutional Connection Profiler — RoboMed v2.2.1
 * Extracts character-perfect error manifests from the Atlas handshake.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');

async function profileConnection() {
  console.log('------------------------------------------------------------');
  console.log('[DIAGNOSTIC] Initiating Clinical Cloud Heartbeat...');
  console.log(`[TARGET] Shards: ac-mrevfes-shard-00...`);
  console.log('------------------------------------------------------------');

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    console.log('[SUCCESS] Institutional Connection formally verified.');
    process.exit(0);
  } catch (err) {
    console.error('[CRITICAL] Identity Rejection Manifest:');
    console.error('------------------------------------------------------------');
    console.error(`Name: ${err.name}`);
    console.error(`Message: ${err.message}`);
    if (err.reason) {
      console.error('Reason Detail:');
      console.dir(err.reason, { depth: null });
    }
    console.error('------------------------------------------------------------');
    process.exit(1);
  }
}

profileConnection();
