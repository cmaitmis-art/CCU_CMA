/**
 * Backend Logging Middleware
 * Logs all API requests and responses with timestamps
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, path, query } = req;
  
  // Log incoming request
  console.log(`[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${method} ${path}${Object.keys(query).length ? '?' + new URLSearchParams(query).toString() : ''}`);

  // Capture the original res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const status = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✓';
    
    console.log(`  ${status} ${statusCode} (${duration}ms)`);
    
    return originalJson.call(this, data);
  };

  next();
};

const errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.error(`[${timestamp}] ERROR ${req.method} ${req.path}: ${err.message}`);
  
  if (err.stack) {
    console.error(err.stack);
  }
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
