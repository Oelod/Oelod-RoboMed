const mongoose = require('mongoose');
const User = require('./src/models/User');

const updateDoc = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/robomed_dev', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const doc = await User.findOneAndUpdate(
      { email: 'doctor@robomed.com' },
      { $set: { specialization: ['Cardiology', 'Orthopedics'] } },
      { new: true }
    );

    console.log('Update successful:', doc ? doc.specialization : 'Not found');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
};

updateDoc();
