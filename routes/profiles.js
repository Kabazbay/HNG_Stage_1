// routes/profiles.js
// This file defines the URL routes and maps each one to a controller function.
// Think of it as a "traffic director" — when a request comes in,
// this file decides which function should handle it.
//
// STAGE 3 CHANGES:
// - Added authenticate middleware (must be logged in)
// - Added authorize middleware (role-based access control)
// - Added CSV export route
// - Route is mounted at BOTH /api/profiles AND /api/v1/profiles (in server.js)

const express = require('express');

// A "router" is a mini-app that only handles routes.
// We define routes on this router, then attach it to the main app in server.js.
const router = express.Router();

// Import middleware
const authorize = require('../middleware/authorize');

// Import the controller functions
const {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
  searchProfilesNLQ,
  exportCSV,
} = require('../controllers/profileController');

// ──────────────────────────────────────────────
// Route definitions
// Each line says: "When this HTTP method hits this URL, run this function"
//
// NOTE: authenticate middleware is applied at the router level in server.js
// for /api/v1/profiles routes. The /api/profiles routes (Stage 2 compat)
// remain unprotected for backward compatibility.
// ──────────────────────────────────────────────

// POST /api/v1/profiles → Create a new profile (ADMIN ONLY)
router.post('/', authorize('admin'), createProfile);

// GET /api/v1/profiles/search → Natural Language Query Search (both roles)
// IMPORTANT: This route MUST come before "/:id"
router.get('/search', authorize('admin', 'analyst'), searchProfilesNLQ);

// GET /api/v1/profiles/export → Export profiles as CSV (both roles)
// IMPORTANT: This route MUST come before "/:id"
router.get('/export', authorize('admin', 'analyst'), exportCSV);

// GET /api/v1/profiles → Get all profiles with filters (both roles)
router.get('/', authorize('admin', 'analyst'), getAllProfiles);

// GET /api/v1/profiles/:id → Get a specific profile by ID (both roles)
router.get('/:id', authorize('admin', 'analyst'), getProfile);

// DELETE /api/v1/profiles/:id → Delete a specific profile (ADMIN ONLY)
router.delete('/:id', authorize('admin'), deleteProfile);

module.exports = router;
