/**
 * Institutional Governance Escalation — RoboMed v2.2.0
 * Formally promotes the target identity to Super Admin (Level 3).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const TARGET_EMAIL = 'admin@robomed.io';

async function promote() {
  try {
    console.log(`[GOVERNANCE] Connecting to Clinical Cloud: ${process.env.MONGODB_URI.split('@')[1]}...`);
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ email: TARGET_EMAIL });
    
    if (!user) {
      console.error(`[CRITICAL] Target Identity Not Found: ${TARGET_EMAIL}`);
      process.exit(1);
    }

    console.log(`[OK] Identity Located: ${user.fullName} (${user._id})`);

    // Institutional Escalation
    user.adminLevel = 3;
    if (!user.roles.includes('admin')) {
      user.roles.push('admin');
    }
    user.status = 'active';
    user.activeRole = 'admin';

    await user.save();

    console.log('------------------------------------------------------------');
    console.log(`[SUCCESS] ESCALATION COMPLETE: ${TARGET_EMAIL} is now SUPER ADMIN.`);
    console.log('------------------------------------------------------------');
    
    process.exit(0);
  } catch (err) {
    console.error(`[FAILURE] Institutional Escalation interrupted: ${err.message}`);
    process.exit(1);
  }
}

promote();
