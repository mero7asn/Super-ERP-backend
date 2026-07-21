const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getTemplates, getTemplate, createTemplate, updateTemplate, 
  deleteTemplate, setDefaultTemplate, renderTemplate 
} = require('../controllers/templateController');

router.get('/', protect, getTemplates);
router.get('/:id', protect, getTemplate);
router.post('/', protect, createTemplate);
router.put('/:id', protect, updateTemplate);
router.delete('/:id', protect, deleteTemplate);
router.post('/:id/set-default', protect, setDefaultTemplate);
router.post('/:id/render', protect, renderTemplate);

module.exports = router;
