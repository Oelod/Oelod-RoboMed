const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/robomed_dev', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('🌱 Creating test accounts...');

    // 1. Doctor Account (Primary Specialist)
    const docExists = await User.findOne({ email: 'doctor@robomed.com' });
    if (!docExists) {
      await User.create({
        fullName: 'Dr. Gregory House',
        email: 'doctor@robomed.com',
        password: 'password123',
        roles: ['patient', 'doctor'],
        activeRole: 'doctor',
        specialization: ['Cardiology', 'Orthopedics']
      });
      console.log('✅ Doctor created (doctor@robomed.com / password123)');
    }

    // 1b. Pulmonology Specialist
    const pulmExists = await User.findOne({ email: 'pulm@robomed.com' });
    if (!pulmExists) {
      await User.create({
        fullName: 'Dr. Sarah Chest',
        email: 'pulm@robomed.com',
        password: 'password123',
        roles: ['patient', 'doctor'],
        activeRole: 'doctor',
        specialization: ['Pulmonology']
      });
      console.log('✅ Pulmonology Doctor created (pulm@robomed.com / password123)');
    }

    // 2. Patient Accounts
    const pat1Exists = await User.findOne({ email: 'patient@robomed.com' });
    if (!pat1Exists) {
      await User.create({
        fullName: 'John Doe',
        email: 'patient@robomed.com',
        password: 'password123',
        roles: ['patient'],
        activeRole: 'patient'
      });
      console.log('✅ Patient 1 created (patient@robomed.com / password123)');
    }

    const pat2Exists = await User.findOne({ email: 'patient2@robomed.com' });
    if (!pat2Exists) {
      await User.create({
        fullName: 'Jane Smith',
        email: 'patient2@robomed.com',
        password: 'password123',
        roles: ['patient'],
        activeRole: 'patient'
      });
      console.log('✅ Patient 2 created (patient2@robomed.com / password123)');
    }

    // 3. Admin Account
    const adminExists = await User.findOne({ email: 'admin@robomed.com' });
    if (!adminExists) {
      await User.create({
        fullName: 'System Admin',
        email: 'admin@robomed.com',
        password: 'password123',
        roles: ['admin'],
        activeRole: 'admin'
      });
      console.log('✅ Admin created (admin@robomed.com / password123)');
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedUsers();
