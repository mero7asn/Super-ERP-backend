# Offers Feature - Implementation Guide

## Overview
Sales agents can now create one or more offers for leads and send them via email or SMS.

## Features Implemented

### 1. Create Multiple Offers per Lead
- Sales agents can create unlimited offers for any lead assigned to them
- Managers can create offers for leads assigned to their team
- Admins can create offers for any lead

### 2. Send Offers via Email, SMS, or Both
- **Email**: Sends formatted offer details to lead's email address
- **SMS**: Sends concise offer summary to lead's phone number
- **Both**: Sends via both channels simultaneously

### 3. Offer Management
- View all offers for a specific lead
- Track offer status: Draft, Sent, Viewed, Accepted, Rejected, Expired
- Delete draft offers
- View send timestamps and delivery method

## How to Use

### Access Offers
1. Navigate to **Leads** page
2. Click the **📼 Offers** button for any lead
3. View all offers for that lead

### Create an Offer
1. Click **Create Offer** button
2. Fill in:
   - **Offer Title**: e.g., "Premium Package"
   - **Description**: Details of what's included
   - **Price**: Dollar amount
   - **Valid Until**: Expiration date
   - **Internal Notes**: (optional) Private notes
3. Click **Create Offer**

### Send an Offer
1. Find the draft offer in the table
2. Click one of:
   - **📧 Email**: Send via email only
   - **💬 SMS**: Send via text message only
   - **📮 Both**: Send via both channels
3. Offer status updates to "Sent"

## Technical Details

### Backend API Endpoints
- `GET /api/offers/lead/:leadId` - Get all offers for a lead
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update offer
- `DELETE /api/offers/:id` - Delete offer
- `POST /api/offers/:id/send` - Send offer via email/SMS

### Database Schema
```javascript
{
  lead: ObjectId,
  createdBy: ObjectId,
  title: String,
  description: String,
  price: Number,
  validUntil: Date,
  status: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired'],
  sentAt: Date,
  sentVia: ['Email', 'SMS', 'Both'],
  notes: String
}
```

### Notification Service
Location: `backend/src/services/notificationService.js`

Currently simulates sending (logs to console). To integrate real services:

**Email Integration** (e.g., SendGrid, AWS SES):
```javascript
const sendEmail = async (to, subject, body) => {
  // Replace with actual service
  // Example: await sgMail.send({ to, from, subject, text: body });
};
```

**SMS Integration** (e.g., Twilio, AWS SNS):
```javascript
const sendSMS = async (to, message) => {
  // Replace with actual service
  // Example: await twilioClient.messages.create({ to, from, body: message });
};
```

### Environment Variables (Future)
Add to `.env` when integrating real services:
```
SENDGRID_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Role-Based Access

| Role | Create Offers | Send Offers | View Offers |
|------|--------------|-------------|-------------|
| Sales Agent | Own leads | Own offers | Own leads |
| Sales Manager | Team leads | Team offers | Team leads |
| Admin | All leads | All offers | All leads |

## Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Login as a sales agent
4. Navigate to Leads → Select a lead → Offers
5. Create and send test offers
6. Check backend console for email/SMS simulation logs

## Future Enhancements
- [ ] Real email service integration (SendGrid/AWS SES)
- [ ] Real SMS service integration (Twilio/AWS SNS)
- [ ] Offer templates
- [ ] Bulk offer sending
- [ ] Offer analytics and tracking
- [ ] Customer response capture
- [ ] Offer versioning
