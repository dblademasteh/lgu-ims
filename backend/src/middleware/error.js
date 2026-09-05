const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        message: 'A record with that unique value already exists.',
        details: err.meta,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found.' });
    }
  }

  const status = err.statusCode || 500;
  const response = { message: err.message || 'Internal server error.' };
  if (err.details) response.details = err.details;
  if (status === 500) console.error('[error]', err);
  return res.status(status).json(response);
}

module.exports = { notFoundHandler, errorHandler };