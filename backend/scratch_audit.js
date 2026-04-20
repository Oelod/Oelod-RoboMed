require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUser() {
    try {
        console.log('📡 Connecting to Registry:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const user = await User.findOne({ email: 'doctor2@robomed.com' });
        if (!user) {
            console.log('❌ Participant not found: doctor2@robomed.com');
        } else {
            console.log('✅ Participant found:', {
                id: user._id,
                email: user.email,
                role: user.roles,
                status: user.status
            });
        }

        const allUsers = await User.find({}).select('email roles status');
        console.log('📋 All Registered Participants:', allUsers);

        process.exit(0);
    } catch (err) {
        console.error('❌ Registry Audit Rupture:', err);
        process.exit(1);
    }
}

checkUser();
