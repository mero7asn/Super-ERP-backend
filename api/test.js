module.exports = (req, res) => {
  res.status(200).json({ ok: true, message: 'Vercel serverless functions work!' });
};
