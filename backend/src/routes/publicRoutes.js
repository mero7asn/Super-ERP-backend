const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const User = require('../models/User');
const crypto = require('crypto');
const { updateExpiredCampaigns } = require('../services/campaignHelper');

// Round-robin assignment helper
const assignRoundRobin = async () => {
  const agents = await User.find({ role: 'Sales Agent', isActive: true }).select('_id');
  if (!agents.length) return null;
  
  const counts = await Promise.all(
    agents.map(async (agent) => ({
      id: agent._id,
      count: await Lead.countDocuments({ assignedTo: agent._id }),
    }))
  );
  
  counts.sort((a, b) => a.count - b.count);
  return counts[0].id;
};

// @desc    Generate a form link for a campaign
// @route   POST /api/public/campaigns/:id/generate-form
// @access  Private (Admin only — called from CampaignsPage)
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.post('/campaigns/:id/generate-form',
  protect,
  authorizeRoles('Super CRM Administrator', 'System Architect', 'Marketing Manager'),
  async (req, res) => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

      if (!campaign.formSlug) {
        campaign.formSlug = crypto.randomBytes(10).toString('hex');
        await campaign.save();
      }

      res.json({ success: true, formSlug: campaign.formSlug });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @desc    Get campaign info for public form
// @route   GET /api/public/form/:slug
// @access  Public
router.get('/form/:slug', async (req, res) => {
  try {
    await updateExpiredCampaigns();
    const campaign = await Campaign.findOne({ formSlug: req.params.slug }).select('name platform status');
    if (!campaign) return res.status(404).json({ message: 'Form not found' });
    if (campaign.status === 'Completed' || campaign.status === 'Paused') {
      return res.status(410).json({ message: 'This form is no longer accepting submissions' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Submit a lead via public campaign form
// @route   POST /api/public/form/:slug
// @access  Public
router.post('/form/:slug', async (req, res) => {
  try {
    await updateExpiredCampaigns();
    const campaign = await Campaign.findOne({ formSlug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Form not found' });
    if (campaign.status === 'Completed' || campaign.status === 'Paused') {
      return res.status(410).json({ message: 'This form is no longer accepting submissions' });
    }

    const { name, email, phone, notes } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ message: 'Name, email, and phone are required' });

    // Auto-assign to agent with fewest leads
    const assignedTo = await assignRoundRobin();

    const lead = await Lead.create({
      name,
      email,
      phone,
      notes: notes || '',
      source: campaign.platform === 'Google' ? 'Google' : campaign.platform === 'Meta' ? 'Meta' : 'Other',
      status: 'New',
      campaign: campaign._id,
      assignedTo,
    });

    res.status(201).json({ success: true, message: 'Thank you! Your information has been submitted.', data: lead });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
