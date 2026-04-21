// controllers/profileController.js
// This file contains the "business logic" — the actual code that runs
// when someone hits each of our API endpoints.
// Each function receives (req, res):
//   req = the incoming request (contains body, params, query)
//   res = the response object (we use it to send data back)

const { uuidv7 } = require('uuidv7');    // For generating UUID v7 IDs (CommonJS compatible)
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
    country_name: profile.country_name,
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
      country_name: nationalityData.country_name,
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
// Supports filtering, sorting, and pagination.
// ═══════════════════════════════════════════════
async function getAllProfiles(req, res) {
  try {
    const {
      gender, country_id, age_group,
      min_age, max_age,
      min_gender_probability, min_country_probability,
      sort_by, order,
      page: rawPage, limit: rawLimit
    } = req.query;

    const filter = {};

    if (gender) filter.gender = new RegExp(`^${gender}$`, 'i');
    if (country_id) filter.country_id = new RegExp(`^${country_id}$`, 'i');
    if (age_group) filter.age_group = new RegExp(`^${age_group}$`, 'i');
    
    if (min_age !== undefined || max_age !== undefined) {
      filter.age = {};
      if (min_age !== undefined) filter.age.$gte = parseInt(min_age, 10);
      if (max_age !== undefined) filter.age.$lte = parseInt(max_age, 10);
    }

    if (min_gender_probability !== undefined) {
      filter.gender_probability = { $gte: parseFloat(min_gender_probability) };
    }

    if (min_country_probability !== undefined) {
      filter.country_probability = { $gte: parseFloat(min_country_probability) };
    }

    // Pagination
    let page = parseInt(rawPage, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(rawLimit, 10);
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    // Sorting
    const sortField = ['age', 'created_at', 'gender_probability'].includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = order === 'desc' ? -1 : 1; // default to asc

    // Execute queries
    const [profiles, total] = await Promise.all([
      Profile.find(filter).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      Profile.countDocuments(filter)
    ]);

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      data: profiles.map(formatProfile), // Changed to formatProfile to match Stage 2 format
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

// ═══════════════════════════════════════════════
// 5. NATURAL LANGUAGE QUERY — GET /api/profiles/search
// ═══════════════════════════════════════════════
async function searchProfilesNLQ(req, res) {
  try {
    const { q, page: rawPage, limit: rawLimit } = req.query;

    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing or empty parameter',
      });
    }

    const { parseNLQ } = require('../utils/nlpParser');
    const parsedFilters = parseNLQ(q);

    if (!parsedFilters) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to interpret query',
      });
    }

    // Now convert the parsed filters into a Mongoose format just like getAllProfiles does
    const mongooseFilter = {};
    
    if (parsedFilters.gender) {
      mongooseFilter.gender = new RegExp(`^${parsedFilters.gender}$`, 'i');
    }
    if (parsedFilters.country_id) {
      mongooseFilter.country_id = new RegExp(`^${parsedFilters.country_id}$`, 'i');
    }
    if (parsedFilters.age_group) {
      mongooseFilter.age_group = new RegExp(`^${parsedFilters.age_group}$`, 'i');
    }

    if (parsedFilters.min_age !== undefined || parsedFilters.max_age !== undefined) {
      mongooseFilter.age = {};
      if (parsedFilters.min_age !== undefined) mongooseFilter.age.$gte = parsedFilters.min_age;
      if (parsedFilters.max_age !== undefined) mongooseFilter.age.$lte = parsedFilters.max_age;
    }

    // Pagination
    let page = parseInt(rawPage, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(rawLimit, 10);
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      Profile.find(mongooseFilter).sort({ created_at: -1 }).skip(skip).limit(limit),
      Profile.countDocuments(mongooseFilter)
    ]);

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      data: profiles.map(formatProfile),
    });

  } catch (error) {
    console.error('Error in searchProfilesNLQ:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
}

// Export all functions so the routes file can use them
module.exports = { createProfile, getProfile, getAllProfiles, deleteProfile, searchProfilesNLQ };
