const Lead = require('../models/Lead');
const User = require('../models/User');

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

// @desc    Receive Meta (Facebook) Lead Ads Webhook
// @route   POST /api/webhooks/meta
// @access  Public
exports.metaWebhook = async (req, res) => {
  try {
    const payload = req.body;
    
    // Simplistic parsing for Meta Lead Ad Payload
    // Real Meta payloads require fetching the actual lead data from Graph API using the leadgen_id
    // But for this simulation, we'll assume the payload contains standard fields or we extract what we can
    let name = 'Unknown Meta Lead';
    let email = 'unknown@meta.com';
    let phone = '0000000000';

    // Simulated parsing of incoming data...
    if (payload && payload.entry && payload.entry.length > 0) {
      const changes = payload.entry[0].changes;
      if (changes && changes.length > 0) {
        const leadgenData = changes[0].value;
        // In a real app, you'd use leadgenData.leadgen_id to call Graph API here.
        // We'll simulate getting the parsed data directly:
        name = leadgenData.full_name || 'Extracted Meta Lead';
        email = leadgenData.email || 'extracted@meta.com';
        phone = leadgenData.phone_number || '1234567890';
      }
    }

    // You can also allow the user to send standard JSON for testing
    if (payload.name) name = payload.name;
    if (payload.email) email = payload.email;
    if (payload.phone) phone = payload.phone;

    // Auto-assign to agent with fewest leads
    const assignedTo = await assignRoundRobin();

    // Save Lead to Database
    const newLead = await Lead.create({
      name,
      email,
      phone,
      source: 'Meta',
      status: 'New',
      assignedTo,
    });

    console.log(`[Webhook] Meta Lead Created: ${newLead._id}`);
    res.status(200).json({ success: true, leadId: newLead._id });

  } catch (error) {
    console.error(`[Webhook] Meta Error: ${error.message}`);
    res.status(500).send('Webhook Error');
  }
};

// @desc    Receive Google Ads Lead Form Webhook
// @route   POST /api/webhooks/google
// @access  Public
exports.googleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    
    // Simplistic parsing for Google Lead Ad Payload
    let name = 'Unknown Google Lead';
    let email = 'unknown@google.com';
    let phone = '0000000000';

    // Google usually sends an array of user_column_data
    if (payload && payload.user_column_data) {
      payload.user_column_data.forEach(item => {
        if (item.column_id === 'FULL_NAME') name = item.string_value;
        if (item.column_id === 'EMAIL') email = item.string_value;
        if (item.column_id === 'PHONE_NUMBER') phone = item.string_value;
      });
    }

    // You can also allow the user to send standard JSON for testing
    if (payload.name) name = payload.name;
    if (payload.email) email = payload.email;
    if (payload.phone) phone = payload.phone;

    // Auto-assign to agent with fewest leads
    const assignedTo = await assignRoundRobin();

    // Save Lead to Database
    const newLead = await Lead.create({
      name,
      email,
      phone,
      source: 'Google',
      status: 'New',
      assignedTo,
    });

    console.log(`[Webhook] Google Lead Created: ${newLead._id}`);
    res.status(200).json({ success: true, leadId: newLead._id });

  } catch (error) {
    console.error(`[Webhook] Google Error: ${error.message}`);
    res.status(500).send('Webhook Error');
  }
};
