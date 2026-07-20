const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOfferType, shouldSyncToInventory } = require('./offerOrderService');

test('normalizes product offers as product orders', () => {
  assert.equal(normalizeOfferType('Product'), 'Product');
  assert.equal(normalizeOfferType('product'), 'Product');
});

test('treats service offers as non-stock orders', () => {
  assert.equal(normalizeOfferType('Service'), 'Service');
  assert.equal(shouldSyncToInventory({ offerType: 'Service' }), false);
});

test('flags product offers for inventory sync', () => {
  assert.equal(shouldSyncToInventory({ offerType: 'Product' }), true);
});
