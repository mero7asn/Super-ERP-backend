const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('./leadController');
const offerController = require('./offerController');
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

test('injectOfferImagesBeforePaymentButton places the offer gallery before the pay button', () => {
  const html = '<div><p>Body</p><a href="https://example.com/pay">Review & Pay Online</a></div>';
  const offer = { images: [{ url: 'https://example.com/image.png', caption: 'Offer image' }] };

  const result = offerController.injectOfferImagesBeforePaymentButton(html, offer, 'https://example.com/pay');

  assert.match(result, /https:\/\/example\.com\/image\.png/);
  assert.ok(result.indexOf('<img') < result.indexOf('Review & Pay Online'));
});

test('prepareEmailWithCid keeps the branding logo inline without adding an attachment', () => {
  const html = '<div><img src="data:image/png;base64,logo" alt="Logo" /></div>';
  const branding = { companyName: 'Acme', companyLogo: 'data:image/png;base64,logo' };

  const result = offerController.prepareEmailWithCid(html, branding);

  assert.equal(result.attachments.length, 0);
  assert.match(result.html, /data:image\/png;base64,logo/);
});

test('replaceOfferPlaceholders uses the offer currency when formatting the price', () => {
  const html = 'Price: {{offer.price}}';
  const data = { offer: { price: 1250, currency: 'EGP' } };

  const result = offerController.replaceOfferPlaceholders(html, data);

  assert.match(result, /EGP|E£/i);
  assert.match(result, /1,250\.00/);
});

test('injectBrandingHeader adds the configured company name and logo into the email body', () => {
  const html = '<div><p>Hello there</p></div>';
  const branding = { companyName: 'Acme Corp', companyLogo: 'data:image/png;base64,logo' };

  const result = offerController.injectBrandingHeader(html, branding);

  assert.match(result, /Acme Corp/);
  assert.match(result, /data:image\/png;base64,logo/);
});

test('addLeadNote normalizes object-shaped existing notes before appending', async () => {
  assert.equal(typeof controller.addLeadNote, 'function');

  const originalCollection = Lead.collection;
  const calls = [];

  Lead.collection = {
    findOne: async () => ({ _id: 'lead-1', notes: { text: 'existing' } }),
    updateOne: async (_filter, update) => {
      calls.push(update);
      return { matchedCount: 1 };
    },
  };

  const req = {
    params: { id: '507f1f77bcf86cd799439011' },
    user: { _id: 'user-1', role: 'Super CRM Administrator', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
    body: { text: 'New note' },
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };

  await controller.addLeadNote(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].$set.notes.length, 0);
  assert.equal(calls[1].$push.notes.text, 'New note');

  Lead.collection = originalCollection;
});
