// middleware/authorize.js
// This middleware checks if the logged-in user has the right ROLE
// to access a specific endpoint.
//
// USAGE:
//   authorize('admin')              → Only admins can access
//   authorize('admin', 'analyst')   → Both roles can access
//
// This MUST run AFTER authenticate middleware (because it needs req.user)
//
// EXAMPLE in routes:
//   router.post('/', authenticate, authorize('admin'), createProfile);
//   router.get('/', authenticate, authorize('admin', 'analyst'), getAllProfiles);

function authorize(...allowedRoles) {
  // This returns a middleware function.
  // The ...allowedRoles syntax collects all arguments into an array.
  // So authorize('admin', 'analyst') → allowedRoles = ['admin', 'analyst']
  return (req, res, next) => {
    // req.user was set by the authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
    }

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Insufficient permissions.',
      });
    }

    // User has the right role — continue
    next();
  };
}

module.exports = authorize;
