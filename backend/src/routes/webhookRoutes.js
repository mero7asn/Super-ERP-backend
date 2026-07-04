const express = require('express');
const router = express.Router();
const { metaWebhook, googleWebhook } = require('../controllers/webhookController');

// Meta Webhooks usually require a GET request for verification during setup
router.get('/meta', (req, res) => {
  if (req.query['hub.verify_token'] === process.env.META_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');
  }
});

// The POST routes to receive the actual lead data
router.post('/meta', metaWebhook);
router.post('/google', googleWebhook);

module.exports = router;
