// middleware/rateLimiter.js
// This middleware limits how many requests a user can make in a time window.
//
// WHY?
// Without rate limiting, someone could:
//   - Spam your login endpoint trying to break in (brute force)
//   - Flood your API with requests and crash your server (DoS attack)
//
// THE RULES (from TRD):
//   - Auth endpoints (/auth/*): 10 requests per minute
//   - All other endpoints: 60 requests per minute per user
//
// WHAT HAPPENS WHEN EXCEEDED:
//   Returns HTTP 429 "Too Many Requests" with a message

const rateLimit = require('express-rate-limit');

// ── Rate limiter for auth endpoints ──
// Strict limit: only 100 requests per 15 minutes
// This prevents brute force login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,              // Maximum 100 requests per window
  standardHeaders: true, // Send rate limit info in response headers (X-RateLimit-*)
  legacyHeaders: false,  // Don't send old X-RateLimit-* headers

  // Custom response when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
    });
  },
});

// ── Rate limiter for all other endpoints ──
// More lenient: 300 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,              // Maximum 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
    });
  },
});

module.exports = { authLimiter, generalLimiter };
