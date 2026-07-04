# Offers Feature - Quick Start

## What's New
Sales team can now create and send offers to leads via email or SMS.

## Quick Steps

### 1. Access Offers
- Go to **Leads** page
- Click **📼 Offers** button next to any lead

### 2. Create Offer
- Click **Create Offer**
- Enter: Title, Description, Price, Valid Until date
- Click **Create Offer**

### 3. Send Offer
Choose how to send:
- **📧 Email** - Send to lead's email
- **💬 SMS** - Send to lead's phone  
- **📮 Both** - Send via both methods

## Files Modified

### Frontend
- ✅ `frontend/src/pages/LeadsPage.jsx` - Added "Offers" button
- ✅ `frontend/src/App.jsx` - Added offers route
- ✅ `frontend/src/pages/OffersPage.jsx` - Already existed

### Backend
- ✅ `backend/src/services/notificationService.js` - NEW: Email/SMS service
- ✅ `backend/src/controllers/offerController.js` - Enhanced send functionality

## Status Tracking
- **Draft** - Not sent yet
- **Sent** - Delivered to lead
- **Viewed** - Lead opened it (future)
- **Accepted** - Lead accepted (future)
- **Rejected** - Lead declined (future)
- **Expired** - Past valid date (future)

## Notes
- Currently simulates email/SMS (logs to console)
- Replace with real services (SendGrid, Twilio, AWS) in production
- See `OFFERS_FEATURE.md` for integration details
