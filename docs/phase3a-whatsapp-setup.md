# Phase 3a — WhatsApp Setup Guide

This phase talks directly to **Meta's WhatsApp Cloud API**
(`graph.facebook.com`), matching the endpoint you shared from your
PromoMessages/Message India setup. If PromoMessages needs a different
request shape once you find their specific docs, only
`backend/src/services/whatsappProvider.service.js` and
`whatsappWebhook.service.js` need to change — nothing else in the app does.

## What you need before this works

1. **A Meta Business Account** with a WhatsApp Business Account (WABA) and
   a phone number registered to it. If PromoMessages set this up for you,
   ask them for:
   - The **Phone Number ID** (not the phone number itself — a numeric ID
     Meta assigns, visible in Meta Business Manager → WhatsApp → API Setup)
   - A **System User access token** with `whatsapp_business_messaging`
     permission (also generated in Meta Business Manager, or provided by
     PromoMessages if they manage this on your behalf)

2. Update `backend/.env`:
   ```dotenv
   WHATSAPP_PHONE_NUMBER_ID=<the numeric phone number ID>
   WHATSAPP_ACCESS_TOKEN=<the system user access token>
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<invent any random string yourself>
   ```
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` isn't given to you by Meta — you make
   it up and then enter the *same* value in both `.env` and Meta's webhook
   registration form (next step). It's just a shared secret so Meta can
   confirm it's really your server answering.

## Registering the webhook with Meta

Meta needs a **publicly reachable HTTPS URL** to send incoming
messages/status updates to — `localhost` won't work for this step. For
local development, use a tunnel tool like [ngrok](https://ngrok.com):

```powershell
ngrok http 5000
```

This gives you a temporary public URL like `https://abc123.ngrok.io`.

In Meta Business Manager → WhatsApp → Configuration → Webhook:
- **Callback URL:** `https://abc123.ngrok.io/api/whatsapp/webhook`
- **Verify Token:** the same value you put in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Subscribe to the **messages** field

Meta will call your `GET /api/whatsapp/webhook` once to verify (handled by
`controller.verifyWebhook`), then start POSTing incoming messages and
status updates to `POST /api/whatsapp/webhook`.

**For production**, this becomes your real domain
(`https://pop.yourcompany.internal/api/whatsapp/webhook` per the Nginx
config in `nginx/pop.conf`) instead of an ngrok tunnel.

## What works right now

- Sending a text message from the chat UI
- Sending an attachment (PDF, image, doc) — uploaded directly to Meta's
  media endpoint, so it works without a public URL for the file itself
  (only the *webhook* needs to be reachable, not your file storage)
- Receiving incoming text/image/document messages from customers, live via
  Socket.IO — no page refresh needed
- Delivery/read/failed status updates reflected live (double-tick, blue
  ticks, error icon) as Meta reports them
- Auto-creating a `Customers` record for a WhatsApp number that messages in
  but isn't in the system yet

## Known Phase 3a limitations (by design — Phase 3b territory)

- Received images/documents are logged as text placeholders
  (`[Image received]`) rather than the actual file being downloaded from
  Meta and stored — downloading inbound media requires an extra Meta API
  call per message, deferred to keep this phase's scope contained.
- No chat assignment/transfer between staff, no internal notes, no typing
  indicator broadcast beyond the socket event existing.
- No template (HSM) message sending UI yet — `whatsappProvider.service.js`
  has `sendTemplate()` ready, just not wired to a controller/route yet.
- Message scheduler (send later / tomorrow / specific time) isn't built —
  that's what BullMQ + Redis in the stack are reserved for, in Phase 3b.
