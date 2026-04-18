/**
 * Institutional Specialization Reparation Script — RoboMed v2.3.1
 * Formally converts concatenated specialization strings into high-fidelity arrays.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function repairSpecializations() {
  try {
    console.log('[REPARATION] Initiating Clinical Data Audit...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[OK] Connected to Production Manifold.');

    const doctors = await User.find({ roles: 'doctor' });
    console.log(`[AUDIT] Found ${doctors.length} practitioner identities.`);

    let repairedCount = 0;
    for (const doc of doctors) {
      if (typeof doc.specialization === 'string' || (Array.isArray(doc.specialization) && doc.specialization.length === 1 && doc.specialization[0].includes(','))) {
        const rawString = Array.isArray(doc.specialization) ? doc.specialization[0] : doc.specialization;
        const cleanArray = rawString.split(',').map(s => s.trim()).filter(Boolean);
        
        doc.specialization = cleanArray;
        await doc.save();
        console.log(`[FIXED] Practitioner ${doc.fullName}: [${cleanArray.join(', ')}]`);
        repairedCount++;
      }
    }

    console.log('------------------------------------------------------------');
    console.log(`[SUCCESS] REPARATION COMPLETE: ${repairedCount} identities hardened.`);
    console.log('------------------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('[CRITICAL] Reparation Failure:', err);
    process.exit(1);
  }
}

repairSpecializations();
