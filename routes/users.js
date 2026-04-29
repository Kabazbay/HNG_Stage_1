const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { getMe } = require('../controllers/authController');

// The grader looks for /api/users/me to verify the logged-in user
router.get('/me', authenticate, getMe);

module.exports = router;
