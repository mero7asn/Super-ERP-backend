const Lead = require('../models/Lead');
const Ticket = require('../models/Ticket');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { updateExpiredCampaigns } = require('../services/campaignHelper');

// @desc    Get system wide analytics
// @route   GET /api/analytics
// @access  Private (Executives and Analysts only)
exports.getSystemAnalytics = async (req, res) => {
  try {
    console.log('📊 Analytics API called');
    
    await updateExpiredCampaigns();
    
    const totalLeads = await Lead.countDocuments();
    const newLeads = await Lead.countDocuments({ status: 'New' });
    const convertedLeads = await Lead.countDocuments({ status: 'Converted' });

    console.log('Leads:', { total: totalLeads, new: newLeads, converted: convertedLeads });

    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'Open' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });

    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'Active' });

    // Lead trends by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Previous period comparison for KPI deltas
    const prevTotalLeads = await Lead.countDocuments({ createdAt: { $lt: oneMonthAgo } });
    const prevNewLeads = await Lead.countDocuments({ status: 'New', createdAt: { $lt: oneMonthAgo } });
    const prevConvertedLeads = await Lead.countDocuments({ status: 'Converted', createdAt: { $lt: oneMonthAgo } });
    const prevTotalTickets = await Ticket.countDocuments({ createdAt: { $lt: oneMonthAgo } });
    const prevOpenTickets = await Ticket.countDocuments({ status: 'Open', createdAt: { $lt: oneMonthAgo } });

    const calcDelta = (current, previous) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    
    // Lead trends by platform from campaigns (last 6 months)
    const leadsByPlatform = await Lead.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, campaign: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: 'campaigns',
          localField: 'campaign',
          foreignField: '_id',
          as: 'campaignInfo'
        }
      },
      { $unwind: '$campaignInfo' },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
            platform: '$campaignInfo.platform',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    console.log('Leads by Platform data points:', leadsByPlatform.length);
    
    const leadsByMonth = await Lead.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
            source: '$source',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Ticket trends by month (last 6 months)
    const ticketsByMonth = await Ticket.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Team performance
    const teamMembers = await User.find({ isActive: true })
      .select('firstName lastName role')
      .lean();

    const teamPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const leadsHandled = await Lead.countDocuments({ assignedTo: member._id });
        const leadsConverted = await Lead.countDocuments({ assignedTo: member._id, status: 'Converted' });
        const ticketsResolved = await Ticket.countDocuments({ assignedTo: member._id, status: 'Resolved' });
        
        const conversionRate = leadsHandled > 0 ? ((leadsConverted / leadsHandled) * 100).toFixed(0) : 0;
        const performance = leadsHandled > 0 || ticketsResolved > 0
          ? Math.min(100, Math.round((leadsConverted * 10 + ticketsResolved * 3)))
          : 0;

        return {
          name: `${member.firstName} ${member.lastName}`,
          role: member.role,
          leads: leadsHandled,
          tickets: ticketsResolved,
          conversionRate: leadsHandled > 0 ? `${conversionRate}%` : '—',
          performance
        };
      })
    );

    // Role distribution
    const roleDistribution = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Sending analytics response');
    
    res.status(200).json({
      success: true,
      data: {
        leads: { 
          total: totalLeads, 
          new: newLeads, 
          converted: convertedLeads,
          deltas: {
            total: calcDelta(totalLeads, prevTotalLeads),
            new: calcDelta(newLeads, prevNewLeads),
            converted: calcDelta(convertedLeads, prevConvertedLeads)
          }
        },
        tickets: { 
          total: totalTickets, 
          open: openTickets, 
          resolved: resolvedTickets,
          deltas: {
            total: calcDelta(totalTickets, prevTotalTickets),
            open: calcDelta(openTickets, prevOpenTickets)
          }
        },
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        leadsByPlatform,
        leadsByMonth,
        ticketsByMonth,
        teamPerformance: teamPerformance.filter(t => t.leads > 0 || t.tickets > 0).slice(0, 10),
        roleDistribution
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
