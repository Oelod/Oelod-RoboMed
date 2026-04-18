const mongoose = require('mongoose');

/**
 * Identity Escrow Manifold
 * Stores character-perfectly encrypted private keys for institutional restoration.
 * The server NEVER sees the plaintext private key.
 */
const identityEscrowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  encryptedPrivateKey: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('IdentityEscrow', identityEscrowSchema);
