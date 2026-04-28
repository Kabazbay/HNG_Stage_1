// middleware/requestLogger.js
// This middleware logs every incoming request.
//
// WHY?
// When something goes wrong (a bug, a security incident, slow performance),
// logs help you figure out WHAT happened and WHEN.
//
// WHAT IT LOGS:
//   - Timestamp (when the request came in)
//   - HTTP Method (GET, POST, DELETE, etc.)
//   - Endpoint (the URL path)
//   - Status Code (200, 404, 500, etc.)
//   - Response Time (how long it took in milliseconds)
//
// EXAMPLE OUTPUT:
//   [2026-04-27T12:00:00.000Z] GET /api/v1/profiles 200 45ms

function requestLogger(req, res, next) {
  // Record the start time so we can calculate how long the request takes
  const startTime = Date.now();

  // res.on('finish') fires when the response has been fully sent to the client.
  // We use it to log AFTER we know the status code and response time.
  res.on('finish', () => {
    const duration = Date.now() - startTime; // Time elapsed in milliseconds
    const timestamp = new Date().toISOString(); // e.g., "2026-04-27T12:00:00.000Z"

    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  // Continue to the next middleware/route — don't block the request!
  next();
}

module.exports = requestLogger;
