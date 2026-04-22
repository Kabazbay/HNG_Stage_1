// scripts/seed.js
// This script reads 'seed-profiles.json' and inserts the data into MongoDB Atlas.
// Idempotency: Uses updateOne with upsert=true so it won't duplicate data if run multiple times.

require('dotenv').config();
const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../seed-profiles.json');

async function runSeeder() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌ Seed file not found at ${SEED_FILE}`);
    console.log(`Please download the JSON file and place it in the project root as 'seed-profiles.json'`);
    process.exit(1);
  }

  // Read and parse JSON file
  const rawData = fs.readFileSync(SEED_FILE, 'utf-8');
  let profilesData;
  try {
    profilesData = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Failed to parse JSON file:', err.message);
    process.exit(1);
  }

  // Optionally, if the JSON wraps profiles in a "data" or "profiles" array, extract it
  const profilesArray = Array.isArray(profilesData) ? profilesData : (profilesData.data || profilesData.profiles);
  
  if (!profilesArray || !Array.isArray(profilesArray)) {
    console.error('❌ Seed data is not a valid array.');
    process.exit(1);
  }

  console.log(`📡 Connecting to MongoDB Atlas...`);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ Connected to Database`);
  } catch (error) {
    console.error(`❌ Database connection failed:`, error.message);
    process.exit(1);
  }

  console.log(`🌱 Seeding ${profilesArray.length} profiles...`);
  
  let inserted = 0;
  let updated = 0;

  const { uuidv7 } = require('uuidv7');

  for (const p of profilesArray) {
    try {
      // Create document payload. Generate a new UUID if 'id' is missing.
      const docId = p.id || uuidv7();
      const profileName = p.name.toLowerCase().trim();

      const docToUpdate = {
        name: profileName,
        gender: p.gender,
        gender_probability: p.gender_probability,
        age: p.age,
        age_group: p.age_group,
        country_id: p.country_id,
        country_name: p.country_name,
        country_probability: p.country_probability,
        created_at: p.created_at ? new Date(p.created_at) : new Date()
      };

      // Upsert based on `name` since it is marked UNIQUE in the schema.
      const result = await Profile.updateOne(
        { name: profileName },
        { $set: docToUpdate, $setOnInsert: { _id: docId } },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
      } else if (result.modifiedCount > 0) {
        updated++;
      }
    } catch (err) {
      console.error(`⚠️ Error upserting profile ${p.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`- Inserted new profiles: ${inserted}`);
  console.log(`- Updated existing profiles: ${updated}`);
  
  await mongoose.disconnect();
  console.log(`\n👋 Disconnected from MongoDB Atlas`);
  process.exit(0);
}

runSeeder();
