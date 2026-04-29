const mongoose = require('mongoose');

const OAuthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  codeVerifier: { type: String, required: true },
  clientType: { type: String, default: 'web' },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Automatically deletes after 10 minutes
});

module.exports = mongoose.model('OAuthState', OAuthStateSchema);
