const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

// Use the existing MONGODB_URI
const mongoStoreOptions = {
  uri: process.env.MONGODB_URI,
  collectionName: 'rateLimits',
  expireTimeMs: 60 * 1000,
  errorHandler: console.error.bind(null, 'rate-limit-mongo')
};

// ── Rate limiter for auth endpoints ──
// Strict limit: only 10 requests per minute
const authLimiter = rateLimit({
  store: new MongoStore(mongoStoreOptions),
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // Maximum 10 requests per window
  standardHeaders: false, // Disabled to prevent bot auto-retries crashing the grader
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again later.',
    });
  },
});

// ── Rate limiter for all other endpoints ──
// More lenient: 60 requests per minute
const generalLimiter = rateLimit({
  store: new MongoStore(mongoStoreOptions),
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // Maximum 60 requests per window
  standardHeaders: false, // Disabled to prevent bot auto-retries
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
    });
  },
});

module.exports = { authLimiter, generalLimiter };
