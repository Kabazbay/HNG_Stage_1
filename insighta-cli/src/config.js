// src/config.js
// Central configuration for the CLI tool.
// All URLs and paths are defined here so they're easy to change.

const path = require('path');
const os = require('os');

module.exports = {
  // The URL of your backend API (proxied through the frontend)
  API_BASE_URL: process.env.INSIGHTA_API_URL || 'https://hng-stage-1-742d.vercel.app',

  // Where credentials (tokens) are stored on the user's computer
  // ~/.insighta/credentials.json
  CREDENTIALS_DIR: path.join(os.homedir(), '.insighta'),
  CREDENTIALS_FILE: path.join(os.homedir(), '.insighta', 'credentials.json'),

  // Temporary local server port for OAuth callback
  // When the CLI starts the OAuth flow, it spins up a tiny HTTP server
  // on this port to catch GitHub's redirect
  CALLBACK_PORT: 9876,
};
