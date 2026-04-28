// routes/auth.js
// This file defines the URL routes for authentication.
// All routes here are prefixed with /auth (set in server.js)
//
// ROUTES:
//   GET  /auth/github           → Start GitHub OAuth flow
//   GET  /auth/github/callback  → GitHub redirects here after authorization
//   POST /auth/refresh          → Exchange refresh token for new access token
//   POST /auth/logout           → Clear tokens and log out
//   GET  /auth/me               → Get current user info (requires auth)
//   GET  /auth/csrf-token       → Get a CSRF token (for web portal)

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

const {
  githubAuth,
  githubCallback,
  refreshToken,
  logout,
  getMe,
  getCsrfToken,
} = require('../controllers/authController');

// ── Public routes (no authentication needed) ──
router.get('/github', githubAuth);              // Start OAuth
router.get('/github/callback', githubCallback); // OAuth callback
router.post('/refresh', refreshToken);          // Refresh tokens

// ── Protected routes (must be logged in) ──
router.post('/logout', authenticate, logout);   // Log out
router.get('/me', authenticate, getMe);         // Who am I?

// ── CSRF token (no auth needed, but returns a token for later use) ──
router.get('/csrf-token', getCsrfToken);

module.exports = router;
