// routes/profilesPublic.js
// This file preserves the ORIGINAL Stage 2 routes WITHOUT authentication.
// These are mounted at /api/profiles (no /v1/) for backward compatibility.
//
// WHY?
// The TRD says "Stage 2 stays intact. Break anything and it counts against you."
// So the old /api/profiles endpoints must continue to work without auth.

const express = require('express');
const router = express.Router();

const {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
  searchProfilesNLQ,
} = require('../controllers/profileController');

// These routes have NO authentication — same as Stage 2
router.post('/', createProfile);
router.get('/search', searchProfilesNLQ);
router.get('/', getAllProfiles);
router.get('/:id', getProfile);
router.delete('/:id', deleteProfile);

module.exports = router;
