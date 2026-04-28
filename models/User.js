// models/User.js
// This file defines the "shape" of a User document in MongoDB.
// Every user who logs in via GitHub gets stored here.
//
// WHY do we need this?
// When someone logs in via GitHub, we need to remember:
//   - WHO they are (githubId, username, email)
//   - WHAT they can do (role: admin or analyst)
//   - HOW to keep them logged in (refreshToken)

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // The unique numeric ID that GitHub assigns to every user.
  // Example: 12345678
  // We use this to find/update the user on subsequent logins.
  githubId: {
    type: String,
    required: true,
    unique: true,
  },

  // Their GitHub username. Example: "kabazbay"
  username: {
    type: String,
    required: true,
  },

  // Their email from GitHub (may be null if they haven't set one public)
  email: {
    type: String,
    default: null,
  },

  // Their GitHub profile picture URL
  avatarUrl: {
    type: String,
    default: null,
  },

  // ROLE: either "admin" or "analyst"
  // - admin: can create profiles, delete profiles, and do everything
  // - analyst: can only READ data (list, view, search, export)
  // Default is "analyst" — most users are read-only
  role: {
    type: String,
    enum: ['admin', 'analyst'], // Only these two values are allowed
    default: 'analyst',
  },

  // The hashed refresh token currently issued to this user.
  // We store it so we can verify refresh requests.
  // "Hashed" means we don't store the actual token — just a fingerprint of it.
  // This way, if the database is ever compromised, attackers can't use the tokens.
  refreshToken: {
    type: String,
    default: null,
  },

  // When this user account was created
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // When this user last logged in
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model. "User" is the model name, "users" is the MongoDB collection name.
module.exports = mongoose.model('User', userSchema, 'users');
