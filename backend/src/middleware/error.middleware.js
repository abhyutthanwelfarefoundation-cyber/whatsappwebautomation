const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { env } = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Unexpected error (bug, DB failure, etc.) - don't leak internals to the client.
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    error = ApiError.internal(env.nodeEnv === 'production' ? 'Something went wrong' : err.message);
  } else if (error.statusCode >= 500) {
    logger.error(error.message, { stack: err.stack });
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

function notFoundMiddleware(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorMiddleware, notFoundMiddleware };
