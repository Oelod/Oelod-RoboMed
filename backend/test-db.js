require('dotenv').config();
const mongoose = require('mongoose');

console.log('📡 [RegistryHeartbeat] Initiating Handshake with MongoDB Atlas...');
console.log(`🔗 Target URI: ${process.env.MONGODB_URI?.split('@')[1] ? 'mongodb+srv://***@' + process.env.MONGODB_URI.split('@')[1] : 'NOT FOUND'}`);

async function testConnection() {
  try {
    const start = Date.now();
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ [SUCCESS] Institutional Handshake Sealed in ${Date.now() - start}ms.`);
    console.log(`🏢 Cluster Host: ${mongoose.connection.host}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ [FAILURE] Forensic Rupture Detected:');
    console.error(`🚨 Error Name: ${err.name}`);
    console.error(`🚨 Error Message: ${err.message}`);
    
    if (err.message.includes('IP address') || err.name === 'MongoServerSelectionError') {
      console.log('\n🛡️ [Statutory Fix]: Your current IP is NOT whitelisted in MongoDB Atlas.');
      console.log('👉 Visit: https://cloud.mongodb.com/ → Network Access → "Add Current IP Address"');
    }
    
    process.exit(1);
  }
}

testConnection();
