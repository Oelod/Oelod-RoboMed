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
      { $addToSet: { roles: 'patient' } },
      { new: true }
    );

    console.log('Update successful, roles:', doc ? doc.roles : 'Not found');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
};

updateDoc();
