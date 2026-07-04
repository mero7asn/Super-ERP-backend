const Campaign = require('../models/Campaign');

/**
 * Automatically update the status of campaigns to 'Completed'
 * if their status is 'Active' and their endDate is in the past.
 */
const updateExpiredCampaigns = async () => {
  try {
    const now = new Date();
    const result = await Campaign.updateMany(
      {
        status: 'Active',
        endDate: { $lt: now }
      },
      {
        $set: { status: 'Completed' }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`Auto-completed ${result.modifiedCount} expired campaign(s).`);
    }
  } catch (error) {
    console.error('Error auto-completing expired campaigns:', error);
  }
};

module.exports = { updateExpiredCampaigns };
