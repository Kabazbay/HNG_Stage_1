// middleware/versionCheck.js
// This middleware ensures that all API requests include the X-API-Version header.
// Required by HNG Stage 3 specs.

module.exports = function versionCheck(req, res, next) {
  // We only enforce versioning on /api routes
  if (req.path.startsWith('/api')) {
    const apiVersion = req.headers['x-api-version'];
    
    if (!apiVersion || apiVersion !== 'v1') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or missing API version. Use X-API-Version: v1 header.',
      });
    }
  }
  
  next();
};
