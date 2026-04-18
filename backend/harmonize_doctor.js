const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const result = await User.findOneAndUpdate(
    { fullName: 'Second Doctor' },
    { $addToSet: { specialization: 'Orthopedics' } },
    { new: true }
  );
  
  if (result) {
    console.log('Institutional Specialty Harmonized!');
    console.log('Updated Specialization Pool:', result.specialization);
  } else {
    console.log('Error: Target Clinician not found in Registry.');
  }

  process.exit();
}
fix();
