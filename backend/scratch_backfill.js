require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Case = require('./src/models/Case');
const User = require('./src/models/User');
const AnonymizedCase = require('./src/models/AnonymizedCase');

async function checkAndBackfill() {
  try {
    await connectDB();
    
    const vaultCount = await AnonymizedCase.countDocuments();
    const cases = await Case.find({ status: { $in: ['closed', 'resolved'] } }).populate('patient');
    console.log(`Vault count: ${vaultCount}`);
    console.log(`Closed/Resolved cases count: ${cases.length}`);
    
    if (vaultCount < cases.length) {
      console.log('Clearing vault and backfilling...');
      await AnonymizedCase.deleteMany({});
      
      for (const c of cases) {
        let diagnosis = c.description; 
        if (c.timeline && c.timeline.length) {
            const closeEvent = c.timeline.find(t => t.event === 'case_closed');
            if (closeEvent) {
                // Extracts summary from note: "Closed. Summary: <text>"
                const parts = closeEvent.note.split('Summary:');
                if (parts.length > 1) {
                    diagnosis = parts[1].trim();
                }
            }
        }
        
        await AnonymizedCase.create({
            age: c.patient && c.patient.age ? c.patient.age : 0,
            gender: c.patient && c.patient.gender ? c.patient.gender : 'unknown',
            description: c.description || 'No clinical description provided.',
            symptoms: c.symptoms,
            diagnosis: diagnosis,
            specialty: c.assignedSpecialty || 'General',
            priority: c.priority || 'medium',
            capturedAt: c.updatedAt
        });
      }
      console.log('Backfill complete!');
    } else {
      console.log('Vault is up to date.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkAndBackfill();
