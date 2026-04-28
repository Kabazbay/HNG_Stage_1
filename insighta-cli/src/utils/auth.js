// src/utils/auth.js
// This file manages token storage and retrieval.
//
// WHERE TOKENS ARE STORED:
//   ~/.insighta/credentials.json
//
// WHAT IT STORES:
//   {
//     "access_token": "eyJhbGci...",
//     "refresh_token": "eyJhbGci...",
//     "user": { "username": "kabazbay", "role": "admin", ... }
//   }
//
// WHY A FILE?
//   The CLI can't use cookies (that's a browser thing).
//   So we save tokens to a file that persists between terminal sessions.

const fs = require('fs');
const path = require('path');
const { CREDENTIALS_DIR, CREDENTIALS_FILE } = require('../config');

// ──────────────────────────────────────────────
// Save credentials to ~/.insighta/credentials.json
// Creates the directory if it doesn't exist
// ──────────────────────────────────────────────
function saveCredentials(data) {
  // Create the ~/.insighta directory if it doesn't exist
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }

  // Write the credentials as pretty-printed JSON
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
}

// ──────────────────────────────────────────────
// Load credentials from ~/.insighta/credentials.json
// Returns null if the file doesn't exist
// ──────────────────────────────────────────────
function loadCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

// ──────────────────────────────────────────────
// Delete credentials (logout)
// ──────────────────────────────────────────────
function clearCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  } catch (error) {
    // Ignore errors — file might already be gone
  }
}

// ──────────────────────────────────────────────
// Get just the access token (shorthand)
// ──────────────────────────────────────────────
function getAccessToken() {
  const creds = loadCredentials();
  return creds ? creds.access_token : null;
}

// ──────────────────────────────────────────────
// Get just the refresh token (shorthand)
// ──────────────────────────────────────────────
function getRefreshToken() {
  const creds = loadCredentials();
  return creds ? creds.refresh_token : null;
}

// ──────────────────────────────────────────────
// Update just the tokens (after a refresh)
// ──────────────────────────────────────────────
function updateTokens(accessToken, refreshToken) {
  const creds = loadCredentials();
  if (creds) {
    creds.access_token = accessToken;
    creds.refresh_token = refreshToken;
    saveCredentials(creds);
  }
}

module.exports = {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  getAccessToken,
  getRefreshToken,
  updateTokens,
};
