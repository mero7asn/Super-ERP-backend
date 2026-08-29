module.exports = async (req, res) => {
  try {
    const app = require('../src/index');
    res.status(200).json({ ok: true, message: 'src/index loaded successfully!' });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      stack: err.stack
    });
  }
};
