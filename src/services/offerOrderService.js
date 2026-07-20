const mongoose = require('mongoose');
const { getOrCreateStockLevel, postTransaction, updateStockLevel, updateLotQuantity, generateId } = require('./inventoryService');
const InventoryItem = require('../models/InventoryItem');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');

const normalizeOfferType = (value) => {
  if (!value) return 'Service';
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'product' || normalized === 'products' || normalized === 'goods' || normalized === 'item') {
    return 'Product';
  }
  return 'Service';
};

const shouldSyncToInventory = (offer) => {
  const offerType = normalizeOfferType(offer?.offerType || offer?.type || offer?.orderType);
  return offerType === 'Product';
};

const syncOfferToInventory = async ({ offer, booking, performedBy }) => {
  if (!offer || !shouldSyncToInventory(offer)) {
    return { synced: false, reason: 'non-product-offer' };
  }

  const warehouse = await Warehouse.findOne({ status: 'Active' }).sort({ createdAt: 1 });
  if (!warehouse) {
    return { synced: false, reason: 'no-warehouse' };
  }

  let item = null;
  if (offer.catalogProduct) {
    const catalogProduct = await Product.findById(offer.catalogProduct);
    if (catalogProduct) {
      item = await InventoryItem.findOne({ sku: String(catalogProduct.sku).trim().toUpperCase() })
        || await InventoryItem.findOne({ product: catalogProduct._id });
    }
  }

  if (!item) {
    const baseSku = String(offer.title || offer.description || 'PRODUCT').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'PRODUCT';
    const candidateSku = `OFF-${baseSku}`.slice(0, 40);

    item = await InventoryItem.findOne({
      $or: [
        { sku: candidateSku },
        { name: new RegExp(`^${String(offer.title || offer.description || 'Product').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      ]
    });
  }

  if (!item) {
    const catalogProduct = offer.catalogProduct ? await Product.findById(offer.catalogProduct) : null;
    const fallbackSku = (catalogProduct?.sku || '').trim().toUpperCase() || `OFF-${String(offer.title || 'PRODUCT').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`.slice(0, 40);
    const fallbackName = catalogProduct?.name || offer.title || 'Lead Offer Product';

    item = await InventoryItem.create({
      sku: fallbackSku,
      name: fallbackName,
      description: offer.description || 'Created automatically from a lead offer',
      baseUom: 'EA',
      unitCost: Number(offer.price || 0),
      sellingPrice: Number(offer.price || 0),
      status: 'Active',
      createdBy: performedBy || null,
      product: catalogProduct?._id || null
    });
  }

  const stock = await getOrCreateStockLevel(item._id, warehouse._id, 'SHIPPING', '', '', '');
  const transactionId = generateId('SO');
  const txn = await postTransaction({
    transactionId,
    type: 'GOODS_ISSUE',
    subtype: 'SALES_SHIPMENT',
    item: item._id,
    warehouse: warehouse._id,
    subinventory: 'SHIPPING',
    locator: '',
    lotNumber: '',
    serialNumber: '',
    quantity: 1,
    unitCost: item.unitCost || 0,
    totalValue: (item.unitCost || 0) * 1,
    referenceType: 'SO',
    referenceId: booking?._id || null,
    referenceNumber: booking?.bookingRef || offer.recordLocator || '',
    reasonCode: 'LEAD_OFFER_PRODUCT',
    remarks: `Product order created from offer ${offer.title}`,
    performedBy: performedBy || null,
    status: 'Posted'
  });

  await updateStockLevel(stock, -1, 'GOODS_ISSUE');
  await updateLotQuantity(null, -1, item._id, warehouse._id, 'SHIPPING', '');

  return { synced: true, transactionId: txn.transactionId, transaction: txn };
};

module.exports = {
  normalizeOfferType,
  shouldSyncToInventory,
  syncOfferToInventory
};
