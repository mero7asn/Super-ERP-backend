const express = require('express');
const router = express.Router();
const { getBookings, getBookingByRef, updateBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getBookings);
router.get('/:ref', protect, getBookingByRef);
router.put('/:id', protect, updateBooking);

module.exports = router;
