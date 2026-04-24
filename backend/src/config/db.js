require('dotenv').config({ override: true });
const mongoose = require('mongoose');

// Statutory Registry Configuration
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    console.log('📡 [Registry] Initiating High-Latency Handshake (45s window)...');
    
    // Industrial Diagnostic: Force certain TLS behaviors for Windows stability
    const connectionOptions = {
      serverSelectionTimeoutMS: 45000,
      bufferCommands: false,
      // Temporary diagnostic: bypass local SSL stack issues if Atlas is rejecting handshake
      tlsInsecure: process.env.NODE_ENV === 'development' 
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Institutional Initialization Ruptured: ${error.message}`);
    console.error('💡 PRO-TIP: Check your MongoDB Atlas IP Whitelist at https://cloud.mongodb.com');
    throw error;
  }
};

module.exports = connectDB;
