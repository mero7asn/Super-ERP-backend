// Migration: backfill OfferVersion snapshots for offers that were sent
// BEFORE versioning was introduced. Idempotent — skips offers that already
// have a v1 snapshot. Run with: node scripts/backfillOfferVersions.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Offer = require('../src/models/Offer');
const OfferVersion = require('../src/models/OfferVersion');
const Email = require('../src/models/Email');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const offers = await Offer.find({});
  let created = 0;
  let skipped = 0;

  for (const offer of offers) {
    const existing = await OfferVersion.findOne({ offerId: offer._id, version: offer.version || 1 });
    if (existing) { skipped++; continue; }

    // Find the most recent email delivered for this offer (if any).
    const email = await Email.findOne({ offerId: offer._id }).sort({ sentAt: -1 });

    await OfferVersion.create({
      offerId: offer._id,
      version: offer.version || 1,
      offerType: offer.offerType,
      title: offer.title,
      description: offer.description,
      price: offer.price,
      validUntil: offer.validUntil,
      notes: offer.notes,
      images: offer.images || [],
      statusAtSnapshot: offer.status,
      changeSummary: 'Backfilled from pre-versioning offer',
      requirement: offer.revisionNote || '',
      emailRef: email ? email._id : null,
      createdBy: offer.createdBy
    });

    if (email && email.offerVersion == null) {
      email.offerVersion = offer.version || 1;
      await email.save();
    }
    created++;
  }

  console.log(`Done. Created ${created} version snapshot(s); skipped ${skipped} already-versioned offer(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Backfill failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
