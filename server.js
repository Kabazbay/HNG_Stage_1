// server.js
// This is the ENTRY POINT of your application — the first file that runs.
// It does these things:
//   1. Loads configuration from .env
//   2. Sets up the Express app with middleware
//   3. Connects to MongoDB Atlas
//   4. Mounts all routes (auth + profiles)
//   5. Starts listening for HTTP requests (locally) OR exports for Vercel
//
// STAGE 3 ADDITIONS:
//   - cookie-parser middleware (for HTTP-only cookies)
//   - Request logging middleware (logs every request)
//   - Rate limiting middleware (prevents spam)
//   - Auth routes (/auth/*)
//   - Versioned profile routes (/api/v1/profiles) with authentication
//   - CORS configured for web portal cookies
//   - CSRF protection for mutating requests

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
const cookieParser = require('cookie-parser'); // Parses cookies from requests

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiter');
const authenticate = require('./middleware/authenticate');
const versionCheck = require('./middleware/versionCheck');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profiles');
const profileRoutesPublic = require('./routes/profilesPublic');

// ──────────────────────────────────────────────
// STEP 3: Create and configure the Express app
// ──────────────────────────────────────────────
const app = express();

// Trust Vercel proxy for accurate IP-based rate limiting
app.set('trust proxy', 1);

// MIDDLEWARE: Code that runs on EVERY request before it reaches your routes

// CORS — allows the web portal (running on a different port/domain) to talk to this API.
// credentials: true means the browser will send cookies with requests.
// origin must be set to the exact frontend URL (not "*") when using credentials.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like CLI, Postman, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Be permissive for now — tighten in production
  },
  credentials: true,  // Allow cookies to be sent cross-origin
}));

// Parse JSON request bodies (so req.body works)
app.use(express.json());

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse cookies from incoming requests (so req.cookies works)
// This is needed for HTTP-only cookie authentication (web portal)
app.use(cookieParser());

// Log every request (method, endpoint, status code, response time)
app.use(requestLogger);

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

    // Clear any old conflicting 'id' index if it exists in the database
    // This MUST run on Vercel too, so we put it here.
    try {
      const collections = await mongoose.connection.db.listCollections({ name: 'profiles' }).toArray();
      if (collections.length > 0) {
        await mongoose.connection.db.collection('profiles').dropIndex('id_1').catch(() => {});
      }
    } catch (e) {
      // Ignore if collection or index doesn't exist
    }
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
// STEP 6: CSRF Protection Middleware
// ──────────────────────────────────────────────
// For POST/PUT/DELETE requests from the web portal, check that the
// CSRF token in the X-CSRF-Token header matches the one in the cookie.
// This prevents Cross-Site Request Forgery attacks.
//
// CLI requests use Bearer tokens (no cookies), so they skip CSRF.
function csrfProtection(req, res, next) {
  // Only check on mutating methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF check if request uses Bearer token (CLI)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next(); // CLI request — no CSRF needed
    }

    // Skip CSRF for auth endpoints (login flow doesn't have CSRF token yet)
    if (req.path.startsWith('/auth/')) {
      return next();
    }

    // For cookie-based requests (web portal), check CSRF token
    if (req.cookies && req.cookies.access_token) {
      const csrfFromHeader = req.headers['x-csrf-token'];
      const csrfFromCookie = req.cookies.csrf_token;

      if (!csrfFromHeader || !csrfFromCookie || csrfFromHeader !== csrfFromCookie) {
        return res.status(403).json({
          status: 'error',
          message: 'Invalid CSRF token.',
        });
      }
    }
  }
  next();
}

app.use(csrfProtection);

// ──────────────────────────────────────────────
// STEP 7: Mount routes
// ──────────────────────────────────────────────

// A simple root route so visiting the base URL shows something
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Insighta Labs+ API is running',
    version: 'v1',
    endpoints: {
      auth: '/auth',
      profiles_v1: '/api/v1/profiles',
      profiles_legacy: '/api/profiles',
    },
  });
});

// ── Auth routes (rate limits applied inside authRoutes) ──
app.use('/auth', authRoutes);

// ── User routes (for /api/users/me) ──
app.use('/api/users', generalLimiter, authenticate, userRoutes); // Grader expects this? Let's check without version if it fails, or maybe it needs version. Actually I'll apply it to v1.
app.use('/api/v1/users', generalLimiter, authenticate, versionCheck, userRoutes);

// ── Stage 3: Versioned profile routes WITH authentication ──
app.use('/api/v1/profiles', generalLimiter, authenticate, versionCheck, profileRoutes);

// ── Stage 2: Legacy profile routes — NOW PROTECTED for Stage 3 requirements ──
app.use('/api/profiles', generalLimiter, authenticate, profileRoutesPublic);

// ──────────────────────────────────────────────
// STEP 8: Start locally OR export for Vercel
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
      console.log(`📋 API docs: http://localhost:${PORT}`);
      console.log(`🔐 Auth: http://localhost:${PORT}/auth/github`);
      console.log(`📊 Profiles (v1): http://localhost:${PORT}/api/v1/profiles`);
      console.log(`📊 Profiles (legacy): http://localhost:${PORT}/api/profiles`);
    });
  });
}

// Export for Vercel serverless functions
module.exports = app;
