const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const ReceivingOrder = require('../models/ReceivingOrder');
const ThreeWayMatch = require('../models/ThreeWayMatch');
const StockLevel = require('../models/StockLevel');
const InventoryItem = require('../models/InventoryItem');

/**
 * Recalculate Supplier Performance Score (On-Time Delivery, Quality, Price)
 */
async function recalculateSupplierScore(supplierId) {
  const pos = await PurchaseOrder.find({ supplier: supplierId, status: 'Fully Received' });
  if (pos.length === 0) return null;

  let totalOnTime = 0;
  let totalQualityPassed = 0;
  let totalSpend = 0;

  for (const po of pos) {
    totalSpend += po.grandTotalEgp || po.grandTotal || 0;
    if (po.promisedDeliveryDate && po.updatedAt) {
      if (new Date(po.updatedAt) <= new Date(po.promisedDeliveryDate)) {
        totalOnTime++;
      }
    } else {
      totalOnTime++; // Default on time if no promised date breach
    }
  }

  const onTimeDeliveryPct = Math.round((totalOnTime / pos.length) * 100);
  const qualityAcceptancePct = 96; // Standard baseline
  const priceScore = 90;

  // Score Formula: OnTime 30% + Quality 25% + Price 20% + LeadTime 10% + Terms 15%
  const overall = Math.round(
    (onTimeDeliveryPct * 0.30) + (qualityAcceptancePct * 0.25) + (priceScore * 0.20) + (90 * 0.10) + (95 * 0.15)
  );

  const supplier = await Supplier.findById(supplierId);
  if (supplier) {
    supplier.performanceScore = {
      overall,
      onTimeDeliveryPct,
      qualityAcceptancePct,
      priceScore,
      leadTimeAdherencePct: 92,
      totalSpendEgp: totalSpend,
      totalOrdersCount: pos.length
    };
    await supplier.save();
  }

  return supplier?.performanceScore;
}

/**
 * Perform 3-Way Matching Validation (PO vs Goods Receipt vs Supplier Invoice)
 */
async function validateThreeWayMatch(poId, receivingId, supplierInvoiceNumber, invoiceAmountEgp) {
  const po = await PurchaseOrder.findById(poId);
  const receiving = await ReceivingOrder.findById(receivingId);

  if (!po || !receiving) {
    throw new Error('PO or Receiving Order not found');
  }

  const poAmount = po.grandTotalEgp || po.grandTotal;
  const receivingAmount = receiving.lines.reduce((sum, l) => sum + (l.receivedQty * (l.unitCost || 0)), 0);

  const quantityDiff = po.items.reduce((sum, i) => sum + i.quantity, 0) - receiving.lines.reduce((sum, l) => sum + l.receivedQty, 0);
  const priceDiffPct = poAmount > 0 ? Math.abs((invoiceAmountEgp - poAmount) / poAmount) * 100 : 0;

  let status = 'Matched';
  if (quantityDiff !== 0) status = 'Quantity Discrepancy Flagged';
  else if (priceDiffPct > 5) status = 'Price Variance Flagged';

  const matchRecord = await ThreeWayMatch.create({
    matchId: `MATCH-${Date.now().toString().slice(-6)}`,
    purchaseOrder: poId,
    receivingOrder: receivingId,
    supplierInvoiceNumber,
    poAmountEgp: poAmount,
    receivingAmountEgp: receivingAmount,
    invoiceAmountEgp: invoiceAmountEgp,
    quantityVariance: quantityDiff,
    priceVariancePct: Math.round(priceDiffPct * 100) / 100,
    status
  });

  return matchRecord;
}

/**
 * Supply Gap Calculation & Purchase Recommendation Generator
 * Formula: Supply Gap = Demand + Safety Stock - Available - Incoming POs
 */
async function calculateSupplyGapAndRecommendations() {
  const items = await InventoryItem.find({ status: 'Active' });
  const stockLevels = await StockLevel.find({});
  const openPos = await PurchaseOrder.find({ status: { $in: ['Approved', 'Sent to Supplier', 'Supplier Confirmed', 'Partially Received'] } });

  const recommendations = [];

  for (const item of items) {
    const itemLevels = stockLevels.filter(sl => sl.item.toString() === item._id.toString());
    const availableStock = itemLevels.reduce((sum, sl) => sum + sl.available, 0);

    // Calculate incoming PO quantities
    let incomingPoQty = 0;
    for (const po of openPos) {
      const line = po.items.find(l => l.item.toString() === item._id.toString());
      if (line) {
        incomingPoQty += (line.quantity - (line.receivedQty || 0));
      }
    }

    const projectedDemand = (item.reorderPoint || 10) * 3; // 30-day projected demand baseline
    const safetyStock = item.safetyStock || 15;

    // Supply Gap formula
    const totalSupply = availableStock + incomingPoQty;
    const totalRequirement = projectedDemand + safetyStock;
    const supplyGap = Math.max(0, totalRequirement - totalSupply);

    if (supplyGap > 0) {
      recommendations.push({
        itemId: item._id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        availableStock,
        incomingPoQty,
        projectedDemand,
        safetyStock,
        supplyGap,
        recommendedOrderQty: Math.max(supplyGap, item.minOrderQty || 1),
        estimatedUnitCost: item.unitCost || 0,
        estimatedTotalCost: Math.max(supplyGap, item.minOrderQty || 1) * (item.unitCost || 0)
      });
    }
  }

  return recommendations;
}

module.exports = {
  recalculateSupplierScore,
  validateThreeWayMatch,
  calculateSupplyGapAndRecommendations
};
