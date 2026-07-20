const crypto = require('crypto');

module.exports = function requestLogger(req, res, next) {
  try {
    const id = crypto.randomBytes(8).toString('hex');
    req.requestId = id;
    const maskedHeaders = { ...req.headers };
    if (maskedHeaders.authorization) maskedHeaders.authorization = '<REDACTED>';
    console.log(`[req:${id}] ${req.method} ${req.originalUrl} user=${req.user?._id || 'anon'} headers=${JSON.stringify(maskedHeaders)} body=${JSON.stringify(req.body)}`);
  } catch (err) {
    console.error('requestLogger failed to run', err && err.message);
  }
  next();
};
