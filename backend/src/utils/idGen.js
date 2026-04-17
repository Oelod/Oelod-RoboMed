const mongoose = require('mongoose');

/**
 * Returns the next sequential integer for a given counter key.
 * Used for human-readable IDs like HSP-0001, CASE-0002.
 *
 * @param {string} name - Counter name (e.g. 'hospitalId', 'caseCode')
 * @returns {Promise<number>} - next sequential number
 */
const Counter = mongoose.model(
  'Counter',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } })
);

const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

/**
 * Generate HSP-XXXX style hospital ID for users.
 */
const generateHospitalId = async () => {
  const seq = await getNextSequence('hospitalId');
  return `HSP-${String(seq).padStart(4, '0')}`;
};

/**
 * Generate CASE-XXXX style case code.
 */
const generateCaseCode = async () => {
  const seq = await getNextSequence('caseCode');
  return `CASE-${String(seq).padStart(4, '0')}`;
};

module.exports = { generateHospitalId, generateCaseCode };
