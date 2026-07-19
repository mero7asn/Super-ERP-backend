try {
  module.exports = require('./index.js');
} catch (e) {
  console.error('[DIAG] module load failed:', e && e.stack ? e.stack : e);
  module.exports = function (req, res) {
    if (!res.headersSent) {
      res.status(500).json({ __diag_error: e && e.message, __diag_stack: e && e.stack });
    }
  };
}
