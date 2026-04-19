require('dotenv').config();
const mongoose = require('mongoose');

// Statutory Registry Configuration
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    console.log('📡 [Registry] Initiating High-Latency Handshake (45s window)...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 45000, // accommodate high-latency connections
      bufferCommands: false,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
