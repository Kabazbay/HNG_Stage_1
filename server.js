// server.js
// This is the ENTRY POINT of your application — the first file that runs.
// It does 4 things:
//   1. Loads configuration from .env
//   2. Sets up the Express app with middleware
//   3. Connects to MongoDB Atlas
//   4. Starts listening for HTTP requests (locally) OR exports for Vercel

// ──────────────────────────────────────────────
// STEP 1: Load environment variables
// ──────────────────────────────────────────────
// dotenv reads your .env file and puts its values into process.env
// This MUST be the very first thing so all other code can access the variables
require('dotenv').config();

// ──────────────────────────────────────────────
// STEP 2: Import dependencies
// ──────────────────────────────────────────────
const express = require('express');  // Web framework
const mongoose = require('mongoose'); // MongoDB connector
const cors = require('cors');        // CORS middleware

// Import our routes
const profileRoutes = require('./routes/profiles');

// ──────────────────────────────────────────────
// STEP 3: Create and configure the Express app
// ──────────────────────────────────────────────
const app = express();

// MIDDLEWARE: Code that runs on EVERY request before it reaches your routes

// cors() adds the header "Access-Control-Allow-Origin: *" to all responses.
// Without this, the grading script CANNOT reach your server.
app.use(cors());

// express.json() tells Express to parse JSON request bodies.
// Without this, req.body would be undefined when someone sends JSON.
app.use(express.json());

// ──────────────────────────────────────────────
// STEP 4: Connect to MongoDB Atlas
// ──────────────────────────────────────────────
// On Vercel (serverless), each request might create a new connection.
// We cache the connection so we don't reconnect on every single request.
// This variable holds the connection promise so we reuse it.
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return; // Already connected, skip
  }

  try {
    // serverSelectionTimeoutMS: 5000 ensures the connection attempts fail
    // after 5 seconds instead of waiting the default 30s.
    // This prevents Vercel from timing out the whole request.
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

// ──────────────────────────────────────────────
// STEP 5: Middleware to ensure DB is connected before handling requests
// ──────────────────────────────────────────────
// This runs before every request and makes sure MongoDB is connected
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next(); // Continue to the actual route handler
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// ──────────────────────────────────────────────
// STEP 6: Mount routes
// ──────────────────────────────────────────────
// This says: "Any request starting with /api/profiles should be handled
// by the profileRoutes router"
app.use('/api/profiles', profileRoutes);

// A simple root route so visiting the base URL shows something
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'HNG Stage 1 — Profile API is running',
  });
});

// ──────────────────────────────────────────────
// STEP 7: Start locally OR export for Vercel
// ──────────────────────────────────────────────
// When running locally with "npm start", we want to listen on a port.
// On Vercel, the platform handles incoming requests — we just export the app.

// This check: if this file is being run directly (node server.js),
// start the server. If it's being imported by Vercel, just export.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  connectToDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  });
}

// Export for Vercel serverless functions
module.exports = app;
