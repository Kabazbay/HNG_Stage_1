// models/Profile.js
// This file defines the "shape" of a Profile document in MongoDB.
// Think of it as a blueprint — every profile stored in the database
// will have exactly these fields with these data types.

const mongoose = require('mongoose');

// A "schema" tells MongoDB what fields each document should have.
// Each field has a type (String, Number, Date) and optional rules.
const profileSchema = new mongoose.Schema({
  // We override MongoDB's default "_id" (which is ObjectId) with our own UUID v7.
  // This is required by the task spec.
  _id: {
    type: String, // UUIDs are strings like "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12"
  },

  // The name that was looked up. Stored in lowercase so "Ella" and "ella" are the same.
  name: {
    type: String,
    required: true, // Every profile MUST have a name
    unique: true,   // No two profiles can have the same name (handles idempotency)
    lowercase: true, // Automatically converts "Ella" → "ella" before saving
    trim: true,      // Removes whitespace from start/end: " ella " → "ella"
  },

  // From Genderize API
  gender: {
    type: String,
    required: true,
  },

  // From Genderize API — how confident the API is about the gender (0 to 1)
  gender_probability: {
    type: Number,
    required: true,
  },

  // From Genderize API — how many people with this name were in their dataset
  sample_size: {
    type: Number,
    required: true,
  },

  // From Agify API — predicted age
  age: {
    type: Number,
    required: true,
  },

  // Calculated from age: "child", "teenager", "adult", or "senior"
  age_group: {
    type: String,
    required: true,
  },

  // From Nationalize API — the country code with highest probability (e.g., "NG", "US")
  country_id: {
    type: String,
    required: true,
  },

  // From Nationalize API / Seed Data — the full country name
  country_name: {
    type: String,
    required: true,
  },

  // From Nationalize API — how confident the API is about the country (0 to 1)
  country_probability: {
    type: Number,
    required: true,
  },

  // When this profile was created — stored as UTC date
  created_at: {
    type: Date,
    default: Date.now, // Automatically set to "right now" when created
  },
}, {
  // These options control how the schema behaves:
  versionKey: false,   // Don't add the "__v" field that Mongoose adds by default
});

// "mongoose.model" creates a model from the schema.
// A model is what you actually use to create, read, update, delete documents.
// 'Profile' = the name of the model
// profileSchema = the blueprint we defined above
// 'profiles' = the actual collection name in MongoDB
module.exports = mongoose.model('Profile', profileSchema, 'profiles');
