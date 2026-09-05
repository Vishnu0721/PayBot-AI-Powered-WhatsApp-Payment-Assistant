import { HttpError } from '../utils/http.js';
import { logError } from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: 'This endpoint does not exist.',
    code: 'NOT_FOUND',
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err instanceof HttpError ? err.status : err.status || 500;
  const code = err.code || 'ERROR';
  let message = err.message || 'Something went wrong.';

  if (err?.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'This payment request was not found.',
      code: 'NOT_FOUND',
    });
  }

  if (status >= 500 && !(err instanceof HttpError)) {
    logError('Unhandled error', err);
    message = 'Unable to connect to PayBot.';
  }

  res.status(status).json({
    success: false,
    error: message,
    code,
  });
}
