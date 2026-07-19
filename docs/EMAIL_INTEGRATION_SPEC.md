# Email Integration Module — Technical Specification

## 1. Overview

The Email Integration Module enables the Super CRM system to send real outbound emails through user-configured SMTP providers. It supports personal email accounts (Gmail, Outlook) and enterprise providers (Google Workspace, Microsoft 365). The sender identity of each outgoing message is derived automatically from the authenticated user's CRM login and SMTP configuration, ensuring the recipient sees the correct sender address. Additionally, the module provides a Sent History feature that renders previously sent offers and emails in a UI that closely mimics the recipient's email-client experience.

## 2. Supported Providers

| Provider | SMTP Host | Port (STARTTLS) | Port (SSL/TLS) | Auth Requirement |
|----------|-----------|-----------------|----------------|------------------|
| Gmail (personal) | `smtp.gmail.com` | 587 | 465 | App Password or OAuth 2.0 |
| Outlook / Hotmail (personal) | `smtp.office365.com` | 587 | 465 | Account password or App Password |
| Google Workspace (enterprise) | `smtp.gmail.com` | 587 | 465 | App Password or domain-wide OAuth 2.0 |
| Microsoft 365 (enterprise) | `smtp.office365.com` | 587 | 465 | Account password or OAuth 2.0 |
| Custom SMTP | Admin-configured | 587 | 465 | Varies by provider |

### 2.1 Authentication Methods
- **App Password**: Recommended for Gmail/Google Workspace when 2FA is enabled.
- **OAuth 2.0**: Preferred for enterprise/centralized admin-managed deployments.
- **Basic Auth (password)**: Supported for Outlook/M365 accounts where allowed by tenant policy.

## 3. System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Backend API │────▶│  Email       │
│ (React/Vite)│     │  (Express)   │     │  Service     │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  SMTP        │
                                         │  Transporter  │
                                         │  (Nodemailer) │
                                         └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  External    │
                                         │  Mail Server │
                                         │  (Gmail/O365)│
                                         └──────────────┘
```

### 3.1 Backend Services
- **Email Service (`emailService.js`)**: Creates Nodemailer transporters per user, sends messages, verifies SMTP connectivity.
- **Offer Controller**: Integrates with the Email Service to dispatch offer emails and persist delivery records.
- **HRM Controller**: Sends internal/external emails via the Email Service.
- **Auth Controller**: Accepts and returns encrypted SMTP configuration.

### 3.2 Frontend Modules
- **User Profile Page**: SMTP configuration form.
- **Sent Emails Page**: Email history with split-pane preview.
- **Sidebar Navigation**: Links to Internal Emails and Sent Emails.

## 4. SMTP Configuration Model

### 4.1 Database Schema — `User` Model Additions

```javascript
{
  smtpHost: { type: String, default: null },
  smtpPort: { type: Number, default: 587 },
  smtpSecure: { type: Boolean, default: false }, // true = SSL/TLS (465), false = STARTTLS (587)
  smtpUser: { type: String, default: null }, // sender email address
  smtpPass: { type: String, default: null }  // encrypted at rest (AES-256-GCM)
}
```

### 4.2 Encryption
- SMTP passwords are encrypted using AES-256-GCM before persistence.
- The encryption key is derived from `ENCRYPTION_SECRET` in `.env`.
- Decryption occurs only at send-time within the Email Service.

### 4.3 Super Admin Configuration
- Super Admin can configure global/default SMTP relay settings at the application level.
- Per-user settings take precedence over global defaults.
- Super Admin can view (but not decrypt) SMTP host/port/user for audit purposes.

## 5. Sender Identity Logic

### 5.1 Primary Rule
The `From` address of every outgoing email is constructed as:
```
From: "{FirstName} {LastName} <{SMTPUsername}>"
```
Where `SMTPUsername` is the user's configured `smtpUser`, falling back to their CRM login `email` if `smtpUser` is absent.

### 5.2 Fallback Behavior
- If a user has no SMTP configuration, the system attempts to use the global/default SMTP relay.
- If no relay is available, the email send fails gracefully and is recorded as `status: 'failed'` in the Email collection with `providerError` set.

### 5.3 Multi-Tenant / Enterprise Considerations
- In Microsoft 365 / Google Workspace environments, the SMTP user must match an authorized mailbox/account in the tenant.
- Sending on behalf of another user (delegation) is out of scope for v1; each user sends as themselves.

## 6. Email Sending Flow

### 6.1 Offer Email Flow
1. User clicks **Send** (Email / SMS / Both) on an offer.
2. Frontend calls `POST /api/offers/:id/send` with `{ method: "Email" }`.
3. Backend validates offer ownership/permissions.
4. Backend builds plain-text and HTML message bodies.
5. Backend creates an `Email` document with `status: 'sent'`, `fromEmail`, `toEmail`, `offerId`.
6. Backend calls `sendEmail(req.user, mailOptions)`.
7. On success: `Email.status` remains `'sent'`.
8. On failure: `Email.status` is updated to `'failed'` and `providerError` is populated.
9. Offer status is updated to `'Sent'` regardless of email delivery status.

### 6.2 Internal Email Flow (HRM / EmailsPage)
1. User composes email via Internal Communications UI.
2. Frontend calls `POST /api/hrm/emails`.
3. Backend stores the email and attempts external delivery via `sendEmail`.
4. Same success/failure recording logic applies.

## 7. Sent History Module

### 7.1 Purpose
Provide users with a complete, searchable history of all emails and offers they have sent, rendered in a format that mirrors the recipient's view.

### 7.2 API Endpoints
- `GET /api/hrm/emails/sent` — List all sent emails for the authenticated user.
- `GET /api/hrm/emails/:id/preview` — Retrieve full email content (body + HTML) for preview.

### 7.3 Data Model — `Email` Collection Additions

```javascript
{
  htmlBody: { type: String, default: null },
  fromEmail: { type: String, default: null },
  toEmail: { type: String, default: null },
  status: { type: String, enum: ['draft', 'sent', 'delivered', 'failed', 'bounced'], default: 'sent' },
  messageId: { type: String, default: null }, // future: provider message ID
  providerError: { type: String, default: null },
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null }
}
```

### 7.4 UI Requirements
- **Split-pane layout**: List of sent emails on the left, preview on the right.
- **Preview rendering**: Use an iframe with `srcDoc` to render HTML bodies in isolation, matching the recipient's visual experience.
- **Status indicators**: Badges for `sent`, `delivered`, `failed`, `bounced`.
- **Metadata display**: From, To, Date, Subject.
- **Search/filter**: By recipient, subject, date range, status.
- **Error visibility**: Display `providerError` when delivery fails.

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| SMTP password exposure | Encrypted at rest (AES-256-GCM); never returned in API responses |
| Unauthorized email sending | Protected routes; ownership checks on offers; role-based access |
| Email injection (header injection) | Nodemailer sanitizes inputs; no raw header construction from user input |
| Spoofing / phishing | Sender identity is strictly bound to authenticated user's configured SMTP account |
| Audit trail | Every send is recorded in the `Email` collection with `senderId`, timestamps, and status |

## 9. Error Handling

### 9.1 SMTP Not Configured
- Return `400 Bad Request` with message: `SMTP is not configured for this user`.
- Record failure in `Email` collection.

### 9.2 Authentication Failure
- Catch SMTP auth errors and record `providerError`.
- Notify the user to verify SMTP settings.

### 9.3 Network / Timeout
- Set reasonable Nodemailer timeouts (`connectionTimeout`, `greetingTimeout`).
- Record transient failures; allow retry via UI.

### 9.4 Rate Limiting
- Implement per-user rate limiting for outbound email to prevent abuse.
- Consider provider-specific limits (Gmail: 500/day for free accounts).

## 10. API Contracts

### 10.1 Send Offer Email
```
POST /api/offers/:id/send
Body: { "method": "Email" | "SMS" | "Both" }
Response: { success: true, message: "Offer sent via Email", data: offer }
```

### 10.2 Get Sent Emails
```
GET /api/hrm/emails/sent
Response: { success: true, data: [email, ...], unreadCount: 0 }
```

### 10.3 Get Email Preview
```
GET /api/hrm/emails/:id/preview
Response: { success: true, data: { htmlBody, body, subject, fromEmail, toEmail, ... } }
```

### 10.4 Update User SMTP Settings
```
PUT /api/auth/users/:id
Body: {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "user@example.com",
  smtpPass: "app-password" // encrypted before save
}
Response: { success: true, data: user }
```

## 11. Frontend Components

### 11.1 User Profile — SMTP Settings Section
- Host, Port, Secure toggle, Username, Password fields.
- Save button with loading/error/success states.
- Password field is masked; only changes are sent to the backend.

### 11.2 Sent Emails Page
- Route: `/emails/sent`
- Layout: CSS Grid with `1fr 1.5fr` columns (list + preview).
- List: Scrollable list of email cards with subject, recipient, date, status badge.
- Preview: Fixed header (From/To/Date/Subject), iframe body, error banner.
- Empty state: "No sent emails yet."

### 11.3 Sidebar
- "Internal Emails" link (`/emails`)
- "Sent Emails" link (`/emails/sent`)

## 12. Testing Strategy

| Test Type | Scope |
|-----------|-------|
| Unit | `emailService.js` — transporter creation, send, verify |
| Unit | `offerController.js` — send offer with/without SMTP config |
| Unit | `User` model — encryption/decryption of `smtpPass` |
| Integration | End-to-end offer send → SMTP → Email record |
| Integration | Internal email send → SMTP → Email record |
| UI | Sent Emails page rendering, preview pane, status badges |
| Security | Ensure `smtpPass` is never exposed in API responses |

## 13. Deployment Considerations

- **Environment Variables**: `ENCRYPTION_SECRET` must be set and consistent across deployments.
- **Firewall**: Outbound ports 587 and 465 must be allowed from the backend server.
- **Rate Limits**: Monitor provider-specific sending limits.
- **Logging**: Log SMTP connection errors; never log passwords or full message bodies in production.
- **Scaling**: For high-volume deployments, consider a dedicated mail queue (e.g., BullMQ + Redis) instead of synchronous sends.

## 14. Future Enhancements

- OAuth 2.0 integration for Gmail/Outlook (eliminate App Passwords).
- Delivery webhooks / bounce handling via provider APIs.
- Email templates with merge fields for offers.
- Scheduled send / drip campaigns.
- Multi-provider fallback (secondary SMTP if primary fails).
- Rich-text composer with CKEditor / TipTap.
