// routes/profiles.js
// This file defines the URL routes and maps each one to a controller function.
// Think of it as a "traffic director" — when a request comes in,
// this file decides which function should handle it.

const express = require('express');

// A "router" is a mini-app that only handles routes.
// We define routes on this router, then attach it to the main app in server.js.
const router = express.Router();

// Import the controller functions
const {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
} = require('../controllers/profileController');

// ──────────────────────────────────────────────
// Route definitions
// Each line says: "When this HTTP method hits this URL, run this function"
// ──────────────────────────────────────────────

// POST /api/profiles → Create a new profile
router.post('/', createProfile);

// GET /api/profiles → Get all profiles (with optional filters)
// IMPORTANT: This route MUST come before "/:id" because Express matches
// routes in order. If "/:id" came first, "GET /api/profiles" would
// treat the word "profiles" as an ID!
router.get('/', getAllProfiles);

// GET /api/profiles/:id → Get a specific profile by ID
// The ":id" is a route parameter — Express extracts it into req.params.id
router.get('/:id', getProfile);

// DELETE /api/profiles/:id → Delete a specific profile
router.delete('/:id', deleteProfile);

module.exports = router;
