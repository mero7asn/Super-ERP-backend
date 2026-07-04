const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, getUsers, getUserById, updateUser, getTeams } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/users', protect, authorizeRoles('Super CRM Administrator', 'System Architect'), getUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id', protect, updateUser);
router.get('/teams', protect, getTeams);

// Example of protecting a route using authorizeRoles
router.delete('/users', protect, authorizeRoles('Super CRM Administrator'), (req, res) => {
  res.json({ message: 'User deleted (dummy route)' });
});

module.exports = router;
