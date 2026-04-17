const User = require('../models/User');
const Case = require('../models/Case');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const { generateHospitalId } = require('../utils/idGen');

/**
 * Universal Clinical Data Ingestion Service
 */

const ingestLegacyPatients = async (patients, actorId) => {
  const results = { total: patients.length, success: 0, failed: 0, errors: [] };
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type !== 'Single';
  
  let session = null;
  if (isReplicaSet) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    for (const p of patients) {
      try {
        const query = User.findOne({ email: p.email });
        if (session) query.session(session);
        const existing = await query;

        if (existing) {
          results.errors.push({ email: p.email, error: 'Identity already persists' });
          results.failed++;
          continue;
        }

        const hospitalId = p.hospitalId || await generateHospitalId();
        const newUser = new User({
          fullName: p.fullName || p.name,
          email: p.email,
          password: 'LEGACY_MIGRATION_ACCESS_REQUIRED',
          roles: ['patient'],
          activeRole: 'patient',
          hospitalId,
          phoneNumber: p.phone || p.phoneNumber,
          age: p.age,
          gender: p.gender,
          status: 'active',
        });

        if (session) {
          await newUser.save({ session });
        } else {
          await newUser.save();
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ email: p.email, error: err.message });
      }
    }
    
    const auditData = { actorId, action: 'BATCH_PATIENT_INGESTION', metadata: { success: results.success } };
    if (session) {
      await AuditLog.create([auditData], { session });
      await session.commitTransaction();
    } else {
      await AuditLog.create(auditData);
    }
    return results;
  } catch (err) { 
    if (session) await session.abortTransaction(); 
    throw err; 
  } finally { 
    if (session) session.endSession(); 
  }
};

const ingestLegacyDoctors = async (doctors, actorId) => {
  const results = { total: doctors.length, success: 0, failed: 0, errors: [] };
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type !== 'Single';

  let session = null;
  if (isReplicaSet) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    for (const d of doctors) {
      try {
        const query = User.findOne({ email: d.email });
        if (session) query.session(session);
        const existing = await query;

        if (existing) {
          results.errors.push({ email: d.email, error: 'Identity already persists' });
          results.failed++;
          continue;
        }

        // Check for duplicate license
        if (d.licenseNumber) {
          const licQuery = User.findOne({ licenseNumber: d.licenseNumber });
          if (session) licQuery.session(session);
          const licExisting = await licQuery;
          if (licExisting) {
            results.errors.push({ email: d.email, error: `License ${d.licenseNumber} already assigned to another practitioner` });
            results.failed++;
            continue;
          }
        }

        const newUser = new User({
          fullName: d.fullName || d.name,
          email: d.email,
          password: 'LEGACY_PRO_MIGRATION',
          roles: ['doctor', 'patient'],
          activeRole: 'doctor',
          phoneNumber: d.phone || d.phoneNumber,
          specialization: d.specialization ? (Array.isArray(d.specialization) ? d.specialization : [d.specialization]) : [],
          licenseNumber: d.licenseNumber,
          status: d.status || 'pending', // Institutional default for migration
        });

        if (session) {
          await newUser.save({ session });
        } else {
          await newUser.save();
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ email: d.email, error: err.message });
      }
    }
    const auditData = { actorId, action: 'BATCH_DOCTOR_INGESTION', metadata: { success: results.success } };
    if (session) {
      await AuditLog.create([auditData], { session });
      await session.commitTransaction();
    } else {
      await AuditLog.create(auditData);
    }
    return results;
  } catch (err) { 
    if (session) await session.abortTransaction(); 
    throw err; 
  } finally { 
    if (session) session.endSession(); 
  }
};

module.exports = { ingestLegacyPatients, ingestLegacyDoctors };
