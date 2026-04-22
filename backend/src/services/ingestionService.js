const csv = require('csv-parser');
const streamifier = require('streamifier');
const User = require('../models/User');
const Case = require('../models/Case');
const userRepo = require('../repositories/userRepository');

/**
 * Ingestion Service — Clinical Data Batch Processing Engine
 */

const processPatientCSV = (buffer, defaultPassword = 'Welcome2RoboMed!') => {
  return new Promise((resolve, reject) => {
    const results = [];
    let processed = 0;
    let failed = 0;

    streamifier.createReadStream(buffer)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              const existing = await userRepo.findByEmail(row.email);
              if (!existing) {
                await User.create({
                  fullName: row.fullName,
                  email: row.email,
                  phoneNumber: row.phoneNumber,
                  password: defaultPassword, 
                  roles: ['patient'],
                  activeRole: 'patient',
                  age: row.age ? parseInt(row.age) : undefined,
                  gender: row.gender?.toLowerCase(),
                  mustChangePassword: true // Enforcement Gate
                });
                processed++;
              } else {
                failed++; // Duplicate email
              }
            } catch (err) {
              failed++;
            }
          }
          resolve({ total: results.length, successful: processed, failed });
        } catch (err) {
          reject(err);
        }
      });
  });
};

const processCaseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let processed = 0;
    let failed = 0;

    streamifier.createReadStream(buffer)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              const patient = await userRepo.findByEmail(row.patientEmail);
              if (patient) {
                await Case.create({
                  patient: patient._id,
                  symptoms: row.symptoms.split(';').map(s => s.trim()),
                  description: row.description,
                  assignedSpecialty: row.specialty,
                  status: row.status || 'open',
                  priority: row.priority?.toLowerCase() || 'medium',
                  timeline: [{ event: 'case_ingested', note: 'Historical record migrated from legacy system' }]
                });
                processed++;
              } else {
                failed++; // Patient not found
              }
            } catch (err) {
              failed++;
            }
          }
          resolve({ total: results.length, successful: processed, failed });
        } catch (err) {
          reject(err);
        }
      });
  });
};

module.exports = {
  processPatientCSV,
  processCaseCSV
};
