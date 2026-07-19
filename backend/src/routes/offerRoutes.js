const express = require('express');
const router = express.Router();
const { getOffersByLead, createOffer, updateOffer, deleteOffer, sendOffer, getTemplates, createTemplate, updateTemplate, deleteTemplate, uploadOfferImage, deleteOfferImage, initiateAvayaCall, getOfferByLocator, getOfferHistory, reviseOffer, getOfferVersions, getOfferVersion, getPaymentLink } = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/lead/:leadId', protect, getOffersByLead);
router.get('/locator/:recordLocator', protect, getOfferByLocator);
router.get('/:id/payment-link', protect, getPaymentLink);
router.post('/', protect, createOffer);
router.put('/:id', protect, updateOffer);
router.delete('/:id', protect, deleteOffer);
router.post('/:id/send', protect, sendOffer);
router.post('/:id/revise', protect, reviseOffer);
router.get('/:id/versions', protect, getOfferVersions);
router.get('/:id/versions/:vid', protect, getOfferVersion);
router.get('/:id/history', protect, getOfferHistory);
router.post('/:id/images', protect, upload.single('image'), uploadOfferImage);
router.delete('/:id/images/:imageId', protect, deleteOfferImage);
router.post('/:id/call', protect, initiateAvayaCall);

// Template routes
router.get('/templates', protect, getTemplates);
router.post('/templates', protect, createTemplate);
router.put('/templates/:id', protect, updateTemplate);
router.delete('/templates/:id', protect, deleteTemplate);

module.exports = router;
