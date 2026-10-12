/**
 * 404 Not Found Middleware
 * Handles requests to endpoints that do not exist.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

/**
 * Centralized Error Handling Middleware
 * Catches all uncaught errors and returns formatted JSON responses.
 * Never leaks sensitive database details or internal server stack traces.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log full error trace server-side for backend diagnostics
  console.error(`[Server Error] [${req.method}] ${req.url}:`, err);

  let message = err.message || 'Internal server error';

  // Sanitize database or unhandled internal errors for 500 status codes
  if (statusCode === 500) {
    if (err.name && (err.name.includes('Prisma') || err.name.includes('Database') || err.name.includes('Connection'))) {
      message = 'A database error occurred. Please try again later.';
    } else if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

