export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function requireDb(req, res, next) {
  if (req.app.get('mongoReady')) return next();
  return res.status(503).json({
    success: false,
    error: 'Unable to connect to PayBot.',
    code: 'DB_UNAVAILABLE',
  });
}
