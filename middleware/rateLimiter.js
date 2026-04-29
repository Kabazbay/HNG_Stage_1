const rateLimit = require('express-rate-limit');

// ── Rate limiter for auth endpoints ──
// Strict limit: only 10 requests per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // Maximum 10 requests per window
  standardHeaders: true,
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
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // Maximum 60 requests per window
  standardHeaders: true,
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
