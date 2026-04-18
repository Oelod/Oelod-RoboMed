const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['patient', 'doctor', 'admin', 'lab', 'pharmacist'];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // NEVER returned in queries by default
    },
    roles: {
      type: [String],
      enum: { values: ROLES, message: '{VALUE} is not a valid role' },
      default: ['patient'],
    },
    activeRole: {
      type: String,
      enum: { values: ROLES, message: '{VALUE} is not a valid role' },
      default: 'patient',
    },
    hospitalId: {
      type: String,
      unique: true,
      sparse: true,
    },
    specialization: {
      type: [String],
      default: [],
    },
    licenseNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Only enforces uniqueness if the field is present
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: function() {
        // Doctors start as pending for manual verification
        return this.roles && this.roles.includes('doctor') ? 'pending' : 'active';
      },
    },
    adminLevel: {
      type: Number,
      default: 0, // 0: None, 1: Moderator, 2: Manager, 3: Super Admin
      min: 0,
      max: 3,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    roleRequest: {
      requestedRole: { type: String, enum: ROLES },
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      requestedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    assignedOffice: {
      type: String,
      default: null,
      enum: [
        null,
        'Chief Medical Office (CMO)',
        'Institutional Ethics Board',
        'Legal & Compliance Dept',
        'Pharmacy Oversight',
        'Laboratory Director',
        'Quality Assurance (QA)',
        'Technical Support / IT'
      ]
    },
    publicKey: {
      type: String, // PEM format or JWK string
      default: null
    },
    passwordResetToken: {
      type: String,
      default: null
    },
    passwordResetExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;  // Extra safety — never serialise password
        return ret;
      },
    },
  }
);

// ── Pre-save: hash password and sanitize unique fields ──────────────────────
userSchema.pre('save', async function (next) {
  // Sanitize empty strings for sparse unique indices
  if (this.licenseNumber === '') this.licenseNumber = undefined;
  if (this.hospitalId === '') this.hospitalId = undefined;

  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance method: compare candidate password ───────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Indexes ───────────────────────────────────────────────────────────────────
// email and hospitalId already indexed via unique:true on the field
userSchema.index({ roles: 1 });
userSchema.index({ fullName: 'text', email: 'text', hospitalId: 'text' }); // for search


const User = mongoose.model('User', userSchema);
module.exports = User;
