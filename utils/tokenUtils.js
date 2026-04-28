// utils/tokenUtils.js
// This file handles creating and verifying JWT tokens.
//
// WHAT IS A JWT?
// A JWT (JSON Web Token) is a string like "eyJhbGciOiJI..." that contains
// encoded information (like user ID, role, expiry time).
// Your server creates it, gives it to the user, and the user sends it back
// on every request to prove who they are.
//
// WHY TWO TOKENS?
// - Access Token: Short-lived (15 minutes). Sent with every API request.
//   If stolen, the damage is limited because it expires fast.
// - Refresh Token: Long-lived (7 days). Used ONLY to get a new access token
//   when the old one expires. Stored more securely.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ──────────────────────────────────────────────
// Generate an Access Token
// Contains: user's MongoDB _id and role
// Expires in: 15 minutes (from .env)
// ──────────────────────────────────────────────
function generateAccessToken(user) {
  // jwt.sign() creates the token string
  // First arg: the data to encode (called "payload")
  // Second arg: the secret key used to sign it (so nobody can forge tokens)
  // Third arg: options like expiry time
  return jwt.sign(
    {
      userId: user._id.toString(),  // MongoDB document ID
      role: user.role,               // "admin" or "analyst"
      type: 'access',                // So we can tell access vs refresh apart
    },
    process.env.JWT_SECRET,          // Secret key from .env
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m', // Default 15 minutes
    }
  );
}

// ──────────────────────────────────────────────
// Generate a Refresh Token
// Contains: user's MongoDB _id
// Expires in: 7 days (from .env)
// ──────────────────────────────────────────────
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: 'refresh',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d', // Default 7 days
    }
  );
}

// ──────────────────────────────────────────────
// Verify a Token
// Takes a token string and checks:
//   1. Is it a valid JWT? (not tampered with)
//   2. Has it expired?
// Returns the decoded payload if valid, or throws an error if not.
// ──────────────────────────────────────────────
function verifyToken(token) {
  try {
    // jwt.verify() checks the signature and expiry
    // If either is invalid, it throws an error
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

// ──────────────────────────────────────────────
// Hash a Refresh Token (for storage in the database)
// We don't want to store the raw token in MongoDB because if the database
// is ever breached, attackers could use the tokens.
// Instead, we store a SHA-256 hash (a one-way fingerprint).
// ──────────────────────────────────────────────
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ──────────────────────────────────────────────
// PKCE Helpers (for OAuth)
//
// WHAT IS PKCE?
// PKCE (Proof Key for Code Exchange) is a security measure for OAuth.
// It prevents attackers from intercepting the OAuth callback and stealing the token.
//
// HOW IT WORKS:
// 1. Client generates a random string called "code_verifier"
// 2. Client creates a SHA-256 hash of it called "code_challenge"
// 3. Client sends code_challenge to GitHub when starting OAuth
// 4. When GitHub calls back, client sends code_verifier to your backend
// 5. Backend hashes code_verifier and checks it matches code_challenge
// ──────────────────────────────────────────────

// Generate a random code_verifier (43-128 characters, URL-safe)
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

// Create a code_challenge from a code_verifier (SHA-256 hash, base64url encoded)
function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
  generateCodeVerifier,
  generateCodeChallenge,
};
