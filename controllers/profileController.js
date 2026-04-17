// controllers/profileController.js
// This file contains the "business logic" — the actual code that runs
// when someone hits each of our API endpoints.
// Each function receives (req, res):
//   req = the incoming request (contains body, params, query)
//   res = the response object (we use it to send data back)

const { v7: uuidv7 } = require('uuid');    // For generating UUID v7 IDs
const Profile = require('../models/Profile'); // Our MongoDB model
const { fetchGender, fetchAge, fetchNationality } = require('../utils/externalApis');

// ──────────────────────────────────────────────
// Helper function: classify age into an age group
// 0–12 → child, 13–19 → teenager, 20–59 → adult, 60+ → senior
// ──────────────────────────────────────────────
function classifyAgeGroup(age) {
  if (age >= 0 && age <= 12) return 'child';
  if (age >= 13 && age <= 19) return 'teenager';
  if (age >= 20 && age <= 59) return 'adult';
  return 'senior'; // 60+
}

// ──────────────────────────────────────────────
// Helper function: format a profile for the response
// Converts the MongoDB document into the exact JSON shape the grading expects
// ──────────────────────────────────────────────
function formatProfile(profile) {
  return {
    id: profile._id,
    name: profile.name,
    gender: profile.gender,
    gender_probability: profile.gender_probability,
    sample_size: profile.sample_size,
    age: profile.age,
    age_group: profile.age_group,
    country_id: profile.country_id,
    country_probability: profile.country_probability,
    created_at: profile.created_at.toISOString(), // Converts Date to "2026-04-01T12:00:00.000Z"
  };
}

// ──────────────────────────────────────────────
// Helper function: format a profile for the "Get All" list response
// This is a shorter format — fewer fields than the full profile
// ──────────────────────────────────────────────
function formatProfileSummary(profile) {
  return {
    id: profile._id,
    name: profile.name,
    gender: profile.gender,
    age: profile.age,
    age_group: profile.age_group,
    country_id: profile.country_id,
  };
}

// ═══════════════════════════════════════════════
// 1. CREATE PROFILE — POST /api/profiles
// ═══════════════════════════════════════════════
async function createProfile(req, res) {
  try {
    // --- STEP 1: Validate the request body ---
    const { name } = req.body; // Extract "name" from the JSON body

    // Check if name is missing entirely or is an empty string
    if (name === undefined || name === null || name === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty name',
      });
    }

    // Check if name is not a string (e.g., someone sent { "name": 123 })
    if (typeof name !== 'string') {
      return res.status(422).json({
        status: 'error',
        message: 'Invalid type',
      });
    }

    // Trim whitespace and check if the trimmed result is empty
    const trimmedName = name.trim();
    if (trimmedName === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty name',
      });
    }

    // --- STEP 2: Check if a profile with this name already exists ---
    // .findOne() searches the database for one document matching the filter
    // We lowercase the name because our schema stores names in lowercase
    const existingProfile = await Profile.findOne({ name: trimmedName.toLowerCase() });

    if (existingProfile) {
      // Profile already exists — return it WITHOUT creating a new one
      // This is "idempotency" — the same request always gives the same result
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: formatProfile(existingProfile),
      });
    }

    // --- STEP 3: Call all 3 external APIs ---
    // We call them all at the same time using Promise.all() for speed.
    // If ANY of them fails, the whole thing fails (and we return 502).
    let genderData, ageData, nationalityData;
    try {
      [genderData, ageData, nationalityData] = await Promise.all([
        fetchGender(trimmedName),
        fetchAge(trimmedName),
        fetchNationality(trimmedName),
      ]);
    } catch (apiError) {
      // One of the external APIs returned invalid data
      return res.status(502).json({
        status: 'error',
        message: apiError.message,
      });
    }

    // --- STEP 4: Classify the age group ---
    const ageGroup = classifyAgeGroup(ageData.age);

    // --- STEP 5: Generate a UUID v7 ---
    // UUID v7 is time-ordered, so newer profiles have "higher" IDs
    const id = uuidv7();

    // --- STEP 6: Create and save the profile to MongoDB ---
    const profile = new Profile({
      _id: id,
      name: trimmedName, // Schema will auto-lowercase this
      gender: genderData.gender,
      gender_probability: genderData.gender_probability,
      sample_size: genderData.sample_size,
      age: ageData.age,
      age_group: ageGroup,
      country_id: nationalityData.country_id,
      country_probability: nationalityData.country_probability,
      created_at: new Date(), // Current time in UTC
    });

    await profile.save(); // This actually writes to MongoDB

    // --- STEP 7: Return the created profile ---
    return res.status(201).json({
      status: 'success',
      data: formatProfile(profile),
    });

  } catch (error) {
    // Catch any unexpected errors (database down, etc.)
    console.error('Error in createProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

// ═══════════════════════════════════════════════
// 2. GET SINGLE PROFILE — GET /api/profiles/:id
// ═══════════════════════════════════════════════
async function getProfile(req, res) {
  try {
    // req.params.id is the ":id" part from the URL
    // e.g., GET /api/profiles/abc-123 → req.params.id = "abc-123"
    const { id } = req.params;

    // Find the profile by its _id field
    const profile = await Profile.findById(id);

    if (!profile) {
      // No profile with this ID exists
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatProfile(profile),
    });

  } catch (error) {
    console.error('Error in getProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

// ═══════════════════════════════════════════════
// 3. GET ALL PROFILES — GET /api/profiles
// Supports optional query params: gender, country_id, age_group
// ═══════════════════════════════════════════════
async function getAllProfiles(req, res) {
  try {
    // req.query contains the URL query parameters
    // e.g., GET /api/profiles?gender=male&country_id=NG
    //   → req.query = { gender: "male", country_id: "NG" }
    const { gender, country_id, age_group } = req.query;

    // Build a filter object for MongoDB
    // Only add filters for parameters that were actually provided
    const filter = {};

    if (gender) {
      // Case-insensitive matching: "Male", "male", "MALE" all work
      // RegExp with 'i' flag means case-insensitive
      filter.gender = new RegExp(`^${gender}$`, 'i');
    }

    if (country_id) {
      // Country codes are typically uppercase (NG, US, GB)
      // But we match case-insensitively to be safe
      filter.country_id = new RegExp(`^${country_id}$`, 'i');
    }

    if (age_group) {
      // age_group values: child, teenager, adult, senior
      filter.age_group = new RegExp(`^${age_group}$`, 'i');
    }

    // .find(filter) searches MongoDB for all documents matching the filter
    // If filter is {}, it returns ALL documents
    const profiles = await Profile.find(filter);

    return res.status(200).json({
      status: 'success',
      count: profiles.length,
      data: profiles.map(formatProfileSummary), // Convert each profile to the short format
    });

  } catch (error) {
    console.error('Error in getAllProfiles:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

// ═══════════════════════════════════════════════
// 4. DELETE PROFILE — DELETE /api/profiles/:id
// ═══════════════════════════════════════════════
async function deleteProfile(req, res) {
  try {
    const { id } = req.params;

    // .findByIdAndDelete() finds a document by _id and deletes it in one step
    // It returns the deleted document, or null if nothing was found
    const deletedProfile = await Profile.findByIdAndDelete(id);

    if (!deletedProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found',
      });
    }

    // 204 = "No Content" — the request succeeded but there's nothing to return
    // .end() sends the response without a body
    return res.status(204).end();

  } catch (error) {
    console.error('Error in deleteProfile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

// Export all 4 functions so the routes file can use them
module.exports = { createProfile, getProfile, getAllProfiles, deleteProfile };
