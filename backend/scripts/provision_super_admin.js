require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/robomed_dev';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB at', MONGO_URI);

    // Check if exists
    const existing = await User.findOne({ email: 'admin@robomed.io' });
    if (existing) {
       existing.adminLevel = 3;
       existing.roles = ['admin', 'patient'];
       await existing.save();
       console.log('Existing user elevated to Super Admin Level 3');
    } else {
       const user = await User.create({
         fullName: 'Institutional Super Admin',
         email: 'admin@robomed.io',
         password: 'SuperSecureAdmin2026!', // In production, this would be changed immediately
         roles: ['admin', 'patient'],
         activeRole: 'admin',
         adminLevel: 3,
         status: 'active',
         hospitalId: 'ADM-001'
       });
       console.log('New Super Admin Provisioned:', user.email);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('PROVISIONING_ERROR:', err);
    process.exit(1);
  }
}

seed();
