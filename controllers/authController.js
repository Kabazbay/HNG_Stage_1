// controllers/authController.js
// This file handles the entire GitHub OAuth authentication flow.
//
// THE BIG PICTURE:
// 1. User wants to log in
// 2. We redirect them to GitHub's login page
// 3. User authorizes our app on GitHub
// 4. GitHub redirects back to us with a "code"
// 5. We exchange that code for a GitHub access token
// 6. We use the GitHub token to get the user's profile info
// 7. We create/update the user in our database
// 8. We generate our OWN JWT tokens and give them to the user
//
// TWO FLOWS:
// - CLI: Returns tokens as JSON
// - Web Portal: Sets tokens as HTTP-only cookies and redirects

const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
} = require('../utils/tokenUtils');

// ──────────────────────────────────────────────
// In-memory store for PKCE code verifiers
// Maps: state → { codeVerifier, clientType, createdAt }
// In production you'd use Redis, but for this project in-memory is fine.
// ──────────────────────────────────────────────
const pendingAuth = new Map();

// Clean up expired entries every 5 minutes (entries expire after 10 min)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of pendingAuth) {
    if (value.createdAt < tenMinutesAgo) {
      pendingAuth.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ──────────────────────────────────────────────
// List of GitHub usernames that should get the "admin" role.
// You can also set this via the ADMIN_GITHUB_USERNAMES env variable.
// Example .env: ADMIN_GITHUB_USERNAMES=kabazbay,someotheruser
// ──────────────────────────────────────────────
function getAdminUsernames() {
  const envAdmins = process.env.ADMIN_GITHUB_USERNAMES || '';
  return envAdmins.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
}

// ═══════════════════════════════════════════════
// 1. START GITHUB OAUTH — GET /auth/github
// ═══════════════════════════════════════════════
// This endpoint generates the GitHub authorization URL.
// The CLI or web portal redirects the user to this URL.
async function githubAuth(req, res) {
  try {
    // client_type tells us if this request is from "cli" or "web"
    // Default to "web" if not specified
    const clientType = req.query.client_type || 'web';

    // ── STEP 1: Generate PKCE values ──
    // code_verifier: a random secret string (stays on our server)
    // code_challenge: SHA-256 hash of code_verifier (sent to GitHub)
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // ── STEP 2: Generate a random "state" parameter ──
    // "state" prevents CSRF attacks on OAuth.
    // We generate a random string, store it, and check it when GitHub calls back.
    const state = crypto.randomBytes(16).toString('hex');

    // ── STEP 3: Store the verifier so we can use it in the callback ──
    pendingAuth.set(state, {
      codeVerifier,
      clientType,
      createdAt: Date.now(),
    });

    // ── STEP 4: Build the GitHub authorization URL ──
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${process.env.BACKEND_URL || req.protocol + '://' + req.get('host')}/auth/github/callback`,
      scope: 'read:user user:email', // What data we want from GitHub
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256', // SHA-256 hashing method
    });

    const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    // For web: redirect the browser directly
    // For CLI: return the URL as JSON so the CLI can open the browser
    if (clientType === 'cli') {
      return res.status(200).json({
        status: 'success',
        data: {
          authUrl: githubUrl,
          state: state,
        },
      });
    } else {
      return res.redirect(githubUrl);
    }
  } catch (error) {
    console.error('GitHub auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initiate GitHub authentication',
    });
  }
}

// ═══════════════════════════════════════════════
// 2. GITHUB CALLBACK — GET /auth/github/callback
// ═══════════════════════════════════════════════
// GitHub redirects here after the user authorizes our app.
// GitHub sends us a "code" and the "state" we generated earlier.
async function githubCallback(req, res) {
  try {
    const { code, state } = req.query;

    // ── STEP 1: Validate the state parameter ──
    if (!state || !pendingAuth.has(state)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OAuth state. Please try logging in again.',
      });
    }

    const { codeVerifier, clientType } = pendingAuth.get(state);
    pendingAuth.delete(state); // One-time use — delete it

    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing authorization code from GitHub.',
      });
    }

    // ── STEP 2: Exchange the code for a GitHub access token ──
    // We send the code + code_verifier to GitHub's token endpoint
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        code_verifier: codeVerifier,
      },
      {
        headers: {
          Accept: 'application/json', // Tell GitHub we want JSON, not form data
        },
      }
    );

    const githubAccessToken = tokenResponse.data.access_token;

    if (!githubAccessToken) {
      console.error('GitHub token response:', tokenResponse.data);
      return res.status(400).json({
        status: 'error',
        message: 'Failed to get access token from GitHub.',
      });
    }

    // ── STEP 3: Fetch the user's GitHub profile ──
    const [userResponse, emailsResponse] = await Promise.all([
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
      axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }).catch(() => ({ data: [] })), // If email fetch fails, just use empty array
    ]);

    const githubUser = userResponse.data;

    // Find the primary email (or first verified email)
    let email = githubUser.email;
    if (!email && emailsResponse.data.length > 0) {
      const primaryEmail = emailsResponse.data.find(e => e.primary) || emailsResponse.data[0];
      email = primaryEmail.email;
    }

    // ── STEP 4: Create or update user in our database ──
    // findOneAndUpdate with upsert:true means:
    //   - If user exists (by githubId), update their info
    //   - If user doesn't exist, create a new one
    const adminUsernames = getAdminUsernames();
    const isAdmin = adminUsernames.includes(githubUser.login.toLowerCase());

    let user = await User.findOne({ githubId: githubUser.id.toString() });

    if (user) {
      // User exists — update their info
      user.username = githubUser.login;
      user.email = email;
      user.avatarUrl = githubUser.avatar_url;
      user.lastLoginAt = new Date();
      // Don't change role on subsequent logins (admin can set it manually)
      await user.save();
    } else {
      // New user — create them
      user = new User({
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        email: email,
        avatarUrl: githubUser.avatar_url,
        role: isAdmin ? 'admin' : 'analyst', // First-time role assignment
        lastLoginAt: new Date(),
      });
      await user.save();
    }

    // ── STEP 5: Generate our own JWT tokens ──
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store the hashed refresh token in the database
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // ── STEP 6: Return tokens based on client type ──
    if (clientType === 'cli') {
      // CLI: Redirect back to the local CLI server with tokens in the URL
      // The CLI listens on port 9876 for this callback.
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        status: 'success'
      });
      return res.redirect(`http://localhost:9876/callback?${params.toString()}`);
    } else {
      // Web Portal: set tokens as HTTP-only cookies and redirect
      // On Vercel, we MUST use SameSite=None and Secure=true for cross-subdomain cookies
      const isLocal = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');
      const cookieOptions = {
        httpOnly: true,
        secure: !isLocal, // Must be true for SameSite=None
        sameSite: isLocal ? 'lax' : 'none',
        path: '/',
      };

      res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Redirect to the web portal
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard`);
    }
  } catch (error) {
    console.error('GitHub callback error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed. Please try again.',
    });
  }
}

// ═══════════════════════════════════════════════
// 3. REFRESH TOKEN — POST /auth/refresh
// ═══════════════════════════════════════════════
// When the access token expires (after 15 min), the client sends
// the refresh token to get a NEW access token without re-logging in.
async function refreshToken(req, res) {
  try {
    // Get refresh token from body (CLI) or cookie (web portal)
    let token = req.body.refresh_token;
    if (!token && req.cookies && req.cookies.refresh_token) {
      token = req.cookies.refresh_token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required.',
      });
    }

    // ── Verify the refresh token ──
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token.',
      });
    }

    // ── Find the user and check the stored hash matches ──
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== hashToken(token)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token. Please log in again.',
      });
    }

    // ── Generate new tokens ──
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update the stored refresh token hash
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    // ── Return based on client type ──
      // Check if this is a cookie-based request (web portal)
      if (req.cookies && req.cookies.refresh_token) {
        const isLocal = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');
        const cookieOptions = {
          httpOnly: true,
          secure: !isLocal,
          sameSite: isLocal ? 'lax' : 'none',
          path: '/',
        };

        res.cookie('access_token', newAccessToken, {
          ...cookieOptions,
          maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', newRefreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          status: 'success',
          message: 'Tokens refreshed successfully.',
        });
      }

    // CLI: return tokens as JSON
    return res.status(200).json({
      status: 'success',
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to refresh token.',
    });
  }
}

// ═══════════════════════════════════════════════
// 4. LOGOUT — POST /auth/logout
// ═══════════════════════════════════════════════
// Clears the refresh token from the database and cookies.
async function logout(req, res) {
  try {
    // Try to identify the user from token
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        // Clear the stored refresh token
        await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
      }
    }

    // Clear cookies (for web portal)
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  }
}

// ═══════════════════════════════════════════════
// 5. WHO AM I — GET /auth/me
// ═══════════════════════════════════════════════
// Returns information about the currently logged-in user.
// This is used by "insighta whoami" and the web portal's account page.
async function getMe(req, res) {
  try {
    // req.user is set by the authenticate middleware
    return res.status(200).json({
      status: 'success',
      data: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        avatar_url: req.user.avatarUrl,
        created_at: req.user.createdAt,
        last_login_at: req.user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get user information.',
    });
  }
}

// ═══════════════════════════════════════════════
// 6. CSRF TOKEN — GET /auth/csrf-token
// ═══════════════════════════════════════════════
// Returns a CSRF token for the web portal.
// The web portal must include this token in the X-CSRF-Token header
// on all POST/PUT/DELETE requests.
function getCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');

  const isLocal = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1');

  // Store CSRF token in an HTTP-only cookie
  res.cookie('csrf_token', token, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? 'lax' : 'none',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });

  // Also return it in the response so the frontend can read it
  // and include it in headers
  return res.status(200).json({
    status: 'success',
    data: { csrf_token: token },
  });
}

module.exports = {
  githubAuth,
  githubCallback,
  refreshToken,
  logout,
  getMe,
  getCsrfToken,
};
