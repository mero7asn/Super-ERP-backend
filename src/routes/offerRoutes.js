const express = require('express');
const router = express.Router();
const { getOffersByLead, createOffer, updateOffer, deleteOffer, sendOffer, getTemplates, createTemplate, updateTemplate, deleteTemplate, uploadOfferImage, deleteOfferImage, initiateAvayaCall, getOfferByLocator, getOfferCommunicationLog, addOfferCommunicationReply } = require('../controllers/offerController');
const { applyDiscount } = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadAttachment = require('../middleware/uploadAttachment');

router.get('/lead/:leadId', protect, getOffersByLead);
router.get('/locator/:recordLocator', protect, getOfferByLocator);
router.post('/', protect, createOffer);
router.put('/:id', protect, updateOffer);
router.delete('/:id', protect, deleteOffer);
router.post('/:id/send', protect, uploadAttachment.array('attachments'), sendOffer);
router.post('/:id/images', protect, upload.single('image'), uploadOfferImage);
router.delete('/:id/images/:imageId', protect, deleteOfferImage);
router.get('/:id/communications', protect, getOfferCommunicationLog);
router.post('/:id/communications/reply', protect, addOfferCommunicationReply);
router.post('/:id/call', protect, initiateAvayaCall);
router.post('/:id/discount', protect, applyDiscount);

// Template routes
router.get('/templates', protect, getTemplates);
router.post('/templates', protect, createTemplate);
router.put('/templates/:id', protect, updateTemplate);
router.delete('/templates/:id', protect, deleteTemplate);

module.exports = router;
