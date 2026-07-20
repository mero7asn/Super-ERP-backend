function buildPutawaySuggestions({ itemDoc, warehouseDoc, existingStock = [], lot, quantity = 0 }) {
  const suggestions = [];

  if (existingStock.length) {
    existingStock.forEach((stock, index) => {
      suggestions.push({
        strategy: 'FIXED_BIN',
        subinventory: stock.subinventory,
        locator: stock.locator || '',
        reason: 'Existing stock location for this item',
        currentStock: stock.onHand,
        priority: index + 1,
        quantity
      });
    });
  }

  if (itemDoc?.shelfLifeDays > 0 && lot?.expiryDate) {
    suggestions.push({
      strategy: 'FEFO_ZONE',
      subinventory: 'QUALITY',
      locator: '',
      reason: 'FEFO putaway for perishable inventory',
      priority: 2,
      quantity
    });
  }

  const receivingArea = warehouseDoc?.subinventories?.find((sub) =>
    sub.name?.toUpperCase().includes('RECEIV') || sub.type === 'Receiving'
  );

  if (receivingArea) {
    suggestions.push({
      strategy: 'DEFAULT_RECEIVING',
      subinventory: receivingArea.code || receivingArea.name.toUpperCase(),
      locator: receivingArea.locators?.[0]?.code || '',
      reason: 'Default receiving area for inbound inspection',
      priority: 3,
      quantity
    });
  }

  const seen = new Set();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.subinventory}|${suggestion.locator}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.priority - b.priority);
}

module.exports = { buildPutawaySuggestions };
