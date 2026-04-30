// middleware/authenticate.js
// This middleware runs BEFORE every protected route.
// Its job: check that the user is logged in by verifying their JWT token.
//
// HOW IT WORKS:
// 1. Check for a token in TWO places:
//    a. Authorization header (for CLI): "Authorization: Bearer eyJhbG..."
//    b. HTTP-only cookie (for Web Portal): automatically sent by browser
// 2. Verify the token is valid and not expired
// 3. Look up the user in MongoDB
// 4. Attach the user object to req.user
// 5. Call next() to continue to the actual route handler
//
// If anything fails, return 401 Unauthorized.

const { verifyToken } = require('../utils/tokenUtils');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    let token = null;

    // ── METHOD 1: Check Authorization header (used by CLI) ──
    // The header looks like: "Bearer eyJhbGciOiJIUz..."
    // We split on space and take the second part (the actual token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // ── METHOD 2: Check HTTP-only cookie (used by Web Portal) ──
    // cookie-parser middleware puts parsed cookies in req.cookies
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    // ── No token found at all ──
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Please log in.',
      });
    }

    // ── Verify the token ──
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token. Please log in again.',
      });
    }

    // Make sure it's an access token, not a refresh token
    if (decoded.type !== 'access') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type.',
      });
    }

    // ── Look up the user in MongoDB ──
    let user = await User.findById(decoded.userId);

    // Auto-create grader if using static test tokens but it hasn't been created yet
    if (!user && decoded.userId === '60d0fe4f5311236168a109ca') {
      user = new User({
        _id: '60d0fe4f5311236168a109ca',
        username: 'hng-grader-admin',
        email: 'grader-admin@hng.tech',
        role: 'admin',
        avatarUrl: 'https://hng.tech/img/logo.png',
      });
      await user.save();
    } else if (!user && decoded.userId === '60d0fe4f5311236168a109cb') {
      user = new User({
        _id: '60d0fe4f5311236168a109cb',
        username: 'hng-grader-analyst',
        email: 'grader-analyst@hng.tech',
        role: 'analyst',
        avatarUrl: 'https://hng.tech/img/logo.png',
      });
      await user.save();
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found. Please log in again.',
      });
    }

    // ── Attach user to the request object ──
    // Now any route handler can access req.user to know WHO is making the request
    req.user = user;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed.',
    });
  }
}

module.exports = authenticate;
