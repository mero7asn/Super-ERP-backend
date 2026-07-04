const Campaign = require('../models/Campaign');
const { updateExpiredCampaigns } = require('../services/campaignHelper');

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = async (req, res) => {
  try {
    await updateExpiredCampaigns();
    const campaigns = await Campaign.find({}).populate('manager', 'firstName lastName email');
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a campaign
// @route   POST /api/campaigns
// @access  Private (Marketing roles + Admin)
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, manager: req.user._id });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ message: 'Failed to create campaign', error: error.message });
  }
};

// @desc    Update a campaign
// @route   PUT /api/campaigns/:id
// @access  Private
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    }).populate('manager', 'firstName lastName email');
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

// @desc    Delete a campaign
// @route   DELETE /api/campaigns/:id
// @access  Private (Admin only)
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
