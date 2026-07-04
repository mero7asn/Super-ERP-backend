const express = require('express');
const router = express.Router();
const { getTickets, getTechnologyUsers, getTicketById, addComment, createTicket, updateTicket } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/technology-users', getTechnologyUsers);

router.get('/:id', getTicketById);
router.post('/:id/comments', addComment);

router.route('/')
  .get(getTickets)
  .post(createTicket);

router.route('/:id')
  .put(updateTicket);

module.exports = router;
