// middleware/versionCheck.js
// This middleware ensures that all API requests include the X-API-Version header.
// Required by HNG Stage 3 specs.

module.exports = function versionCheck(req, res, next) {
  const apiVersion = req.headers['x-api-version'];
  
  if (!apiVersion) {
    return res.status(400).json({
      status: 'error',
      message: 'API Version Header Missing',
    });
  }

  if (apiVersion !== 'v1') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid API Version',
    });
  }

  next();
};
