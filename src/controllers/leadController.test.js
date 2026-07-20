const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('./leadController');
const Lead = require('../models/Lead');

test('getLeadById returns a populated lead for authorized requests', async () => {
  assert.equal(typeof controller.getLeadById, 'function');

  const originalFindById = Lead.findById;
  const fakeLead = {
    _id: 'lead-1',
    name: 'Test Lead',
    status: 'New',
    assignedTo: { toString: () => 'agent-1' },
    populate: async function () { return this; },
  };

  Lead.findById = () => ({
    populate: async () => ({
      populate: async () => fakeLead,
    }),
  });

  const req = { params: { id: 'lead-1' }, user: { role: 'Sales Agent', _id: 'agent-1' } };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };

  await controller.getLeadById(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data._id, 'lead-1');

  Lead.findById = originalFindById;
});
