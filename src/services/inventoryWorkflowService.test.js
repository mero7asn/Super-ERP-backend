const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPutawaySuggestions } = require('./inventoryWorkflowService');

test('buildPutawaySuggestions prioritizes fixed-bin and FEFO guidance', () => {
  const warehouseDoc = {
    subinventories: [
      { code: 'RCV', name: 'Receiving', type: 'Receiving', locators: [{ code: 'R1' }] },
      { code: 'FG', name: 'Finished Goods', type: 'Finished Goods', locators: [{ code: 'F1' }] }
    ]
  };

  const itemDoc = { shelfLifeDays: 30 };
  const existingStock = [{ subinventory: 'FG', locator: 'F1', onHand: 20 }];
  const lot = { expiryDate: new Date('2030-01-01') };

  const suggestions = buildPutawaySuggestions({ itemDoc, warehouseDoc, existingStock, lot, quantity: 10 });

  assert.ok(suggestions.length >= 2);
  assert.equal(suggestions[0].strategy, 'FIXED_BIN');
  assert.ok(suggestions.some((s) => s.strategy === 'FEFO_ZONE'));
});
