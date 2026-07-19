const express = require('express');
const router = express.Router();
const { getPublicOfferByToken, processPublicPayment } = require('../controllers/paymentController');

// Public payment page endpoints (no auth required)
router.get('/:token', getPublicOfferByToken);
router.post('/:token', processPublicPayment);

module.exports = router;
