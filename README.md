# PayBot

Collect payments. Right from WhatsApp.

PayBot is a WhatsApp-first payment collection app for small Indian businesses. You (or your staff) ask for money in natural language; PayBot creates a **Razorpay Payment Link**, delivers it, and marks the request **PAID** only after a verified Razorpay webhook.

PayBot is **not** a UPI wallet. Razorpay processes the money.

## How it works

```
Seller → OTP login → Dashboard / WhatsApp
     → “₹500 for groceries from 9876543210”
     → Parse amount + customer
     → Create Razorpay Payment Link
     → Send pay link to customer (WhatsApp / public /pay/:id page)
     → Customer pays on Razorpay
     → Webhook → status PAID → dashboard updates
```

### Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind (`frontend/`) |
| Backend | Express (ESM) + Mongoose (`backend/`) |
| DB | MongoDB (`MONGODB_URI`) |
| Payments | Razorpay Payment Links + webhooks |
| Messaging | WhatsApp Cloud API (Meta) |
| Auth | WhatsApp / MSG91 / Twilio OTP → JWT |

### Modes (important)

| Flag | Controls | Notes |
|---|---|---|
| `DEMO_MODE=true` | Payments + soft guards | Simulated payment links if Razorpay missing; WhatsApp simulator allowed; UI shows **DEMO PAY** |
| `DEMO_MODE=false` | Full live | Real Razorpay links; PAID only via webhook; simulator off; boot refuses incomplete config |
| `OTP_DEMO_MODE=true` | Login OTP UI | Shows **Development OTP** on verify screen |
| `OTP_DEMO_MODE=false` | Login OTP delivery | Sends via `OTP_PROVIDER` (whatsapp / msg91 / twilio) |

You can run **hybrid**: `DEMO_MODE=true` + `OTP_DEMO_MODE=false` + WhatsApp keys → real WhatsApp login OTP while payments stay simulated (useful before Razorpay KYC/PAN).

`NODE_ENV=production` refuses `DEMO_MODE=true`. Live also refuses `OTP_DEMO_MODE=true`.

Never mark a live payment PAID from the frontend. Only a verified Razorpay webhook can.

---

## Quick start (local)

Use **three terminals**. Put secrets only in `backend/.env` (gitignored). Never commit real keys in `.env.example`.

### 1) Database

**Option A — local durable Mongo (no Docker):**

```bash
cd backend
npm install
npm run db:local
```

Keep this running. Data: `.data/mongo`.

**Option B — Docker:**

```bash
docker compose up -d
```

In `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/paybot
```

If `DEMO_MODE=true` and Mongo is down, the API falls back to a durable demo DB under `.data/demo-mongo`. Prefer a real Mongo for serious testing.

### 2) Backend API

```bash
cd backend
cp .env.example .env
# edit .env — at least JWT_SECRET, OTP_PEPPER, MONGODB_URI
npm run dev
```

API: http://127.0.0.1:3000  
Health: http://127.0.0.1:3000/api/health

### 3) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: http://127.0.0.1:5173  

`frontend/.env`:

```env
VITE_API_URL=/api
```

Vite proxies `/api` → `http://127.0.0.1:3000`.

### Tests

```bash
cd backend
npm test
```

---

## Environment variables

Create `backend/.env` from `.env.example`.

### Always required

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | JWT signing (16+ chars) |
| `OTP_PEPPER` | OTP hashing (16+ chars; falls back to JWT if weak/missing) |
| `MONGODB_URI` | Mongo connection string |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |

### Mode switches

| Variable | Typical local | Full live |
|---|---|---|
| `DEMO_MODE` | `true` | `false` |
| `OTP_DEMO_MODE` | `true` (easiest) or `false` with WhatsApp | `false` |
| `OTP_PROVIDER` | `whatsapp` (free Meta sandbox) | `whatsapp` or `msg91` |

### Razorpay (test keys first: `rzp_test_…`)

| Variable | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` | Platform Key ID |
| `RAZORPAY_KEY_SECRET` | Platform Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Required for `DEMO_MODE=false` / PAID confirmation |

Indian Razorpay signup may ask for **PAN**. Without PAN you can keep `DEMO_MODE=true` and still develop.

### WhatsApp Cloud API (Meta — use developers.facebook.com, not dev.meta.ai)

| Variable | Purpose |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Temporary or system user token |
| `WHATSAPP_PHONE_NUMBER_ID` | From API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Optional |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose (e.g. `paybot_verify_123`) |
| `WHATSAPP_APP_SECRET` | App settings → Basic |
| `WHATSAPP_OTP_TEMPLATE_NAME` | Approved Auth template (recommended for reliable OTP) |
| `WHATSAPP_OTP_TEMPLATE_LANGUAGE` | e.g. `en` |
| `WHATSAPP_OTP_TEMPLATE_BUTTON` | `url` (default) \| `otp` \| `none` |
| `WHATSAPP_PAYMENT_TEMPLATE_NAME` | Customer pay-link template (merchant, amount, description, url) |

### Optional

| Variable | Purpose |
|---|---|
| `MSG91_*` / `TWILIO_*` | Alternate OTP providers |
| `CREDENTIALS_ENCRYPTION_KEY` | Encrypt per-merchant Razorpay secrets in Setup |
| `PARSER_PROVIDER=llm` + `PARSER_LLM_API_KEY` | Optional AI parser |
| `REMINDERS_ENABLED` | Auto reminders for PENDING |
| `RECURRING_ENABLED` | Recurring collection worker |

---

## Useful npm scripts (`backend/`)

| Script | What it does |
|---|---|
| `npm run dev` | API with `--watch` |
| `npm run db:local` | Durable Mongo on `:27017` (keep open) |
| `npm run live:l0` | Check Mongo / basic L0 readiness |
| `npm run live:check` | Report missing live keys (no secrets printed) |
| `npm run live:enable` | Flip to LIVE **only if** required keys exist |
| `npm run live:setup -- https://YOUR_TUNNEL` | Print exact webhook URLs |
| `npm run tunnel` | `cloudflared tunnel --url http://127.0.0.1:3000` |
| `npm test` | Backend unit tests |

---

## Free local path (recommended first)

Goal: login + dashboard + WhatsApp simulator / demo payments without PAN.

1. `npm run db:local` + `npm run dev` (backend) + `npm run dev` (frontend)
2. `.env`:
   ```env
   DEMO_MODE=true
   OTP_DEMO_MODE=true
   JWT_SECRET=...
   OTP_PEPPER=...
   MONGODB_URI=mongodb://127.0.0.1:27017/paybot
   ```
3. Open http://127.0.0.1:5173/login → use **Development OTP** on verify screen
4. Complete onboarding → use **WhatsApp** page simulator:
   ```text
   ₹500 for groceries from 9876543210
   ```
5. Open the customer pay link → **Simulate confirmation (demo)** if no Razorpay keys

### Hybrid: real WhatsApp OTP + demo payments

1. Create a Meta app at https://developers.facebook.com (Business) → add **WhatsApp**
2. API Setup → Generate token, copy Phone number ID
3. App settings → Basic → App secret
4. Under **To**, add recipient numbers to the **allowlist** (sandbox max ~5) and verify them
5. `.env`:
   ```env
   DEMO_MODE=true
   OTP_DEMO_MODE=false
   OTP_PROVIDER=whatsapp
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_APP_SECRET=...
   WHATSAPP_VERIFY_TOKEN=paybot_verify_123
   ```
6. Restart API. UI badge: **DEMO PAY** + **OTP WA**
7. Login with an **allowlisted** number → OTP arrives on WhatsApp

**OTP delivery tips (Meta sandbox):**

- Free-text OTP often needs an open 24h window: on the phone, message the Meta **test business number** (`+1 555…`) with `hi`, then **Resend OTP** in PayBot.
- Error `(#131030) Recipient phone number not in allowed list` → add that number under API Setup → **To**.
- For reliable OTP without the `hi` step, create an **Authentication** template and set `WHATSAPP_OTP_TEMPLATE_NAME`.
- If Meta rejects send while `DEMO_MODE=true`, PayBot may show an on-screen fallback code so you are not locked out.

---

## Full live (real payments)

Requires Razorpay **test** keys + webhook secret, WhatsApp + app secret, and a public HTTPS tunnel.

### Tunnel

```bash
cd backend
npm run tunnel
# or: cloudflared tunnel --url http://127.0.0.1:3000
```

Copy the `https://….trycloudflare.com` URL, then:

```bash
npm run live:setup -- https://YOUR-TUNNEL-HOST
```

### Razorpay

1. Dashboard → **Test Mode** → API Keys → put Key ID/Secret in `.env`
2. Webhooks → URL: `https://YOUR-TUNNEL/api/razorpay/webhook`
3. Events: `payment_link.paid`, `payment.captured`
4. Copy signing secret → `RAZORPAY_WEBHOOK_SECRET`

### WhatsApp webhooks

1. Callback: `https://YOUR-TUNNEL/api/whatsapp/webhook`
2. Verify token = `WHATSAPP_VERIFY_TOKEN`
3. App secret = `WHATSAPP_APP_SECRET`

### Enable live

```bash
cd backend
npm run live:check
npm run live:enable   # refuses if keys missing
# restart API — should log LIVE mode
```

Live boot fails fast if Mongo, Razorpay keys+webhook, WhatsApp+app secret, or OTP provider are incomplete.

---

## How to test (checklists)

### A) Smoke test (no external keys)

1. Start `db:local`, backend, frontend
2. `GET /api/health` → `mongodb: true`, `demoMode: true`
3. Login with `OTP_DEMO_MODE=true` → Development OTP
4. Onboarding → business name
5. WhatsApp simulator: `₹500 for groceries from 9876543210`
6. Payments list shows PENDING → public pay page → simulate → PAID
7. Customers page shows the customer

### B) WhatsApp OTP (allowlisted number)

1. Hybrid env (`OTP_DEMO_MODE=false`, WhatsApp keys set)
2. Allowlist your number in Meta
3. Message Meta test number `hi`
4. Login → OTP on WhatsApp (no Development OTP box)
5. Wrong/unlisted number → Meta `#131030` → on-screen fallback if still in `DEMO_MODE`

### C) Razorpay test payment (tunnel + webhook)

1. Platform test keys + webhook secret + tunnel
2. `DEMO_MODE=false` via `live:enable` (or keep demo if webhook missing)
3. Create payment → open real Payment Link → pay with Razorpay test methods
4. Webhook fires → status **PAID** (no simulate button in live)

### D) Automated

```bash
cd backend
npm test
```

---

## Main app routes

| Area | Path | Notes |
|---|---|---|
| Login / OTP | `/login`, `/verify` | Seller auth |
| Overview | `/app` | Dashboard analytics |
| Payments | `/app/payments` | Create / cancel / notify |
| Recurring | `/app/recurring` | Scheduled collections |
| Customers / Products | `/app/customers`, `/app/products` | CRM-lite |
| WhatsApp | `/app/whatsapp` | Simulator in DEMO; live = Cloud API |
| Team | `/app/team` | Owner invites staff (RBAC) |
| Setup | `/app/setup` | Profile + Razorpay connect |
| Public pay | `/pay/:id` | Customer payment page |

### Example collection phrases

```text
₹500 for groceries from 9876543210
Collect 1200 from Ramesh for tuition
```

Name-only requests ask for a 10-digit WhatsApp number before sending.

---

## Product features

- OTP auth, seller isolation, staff RBAC
- NL parse → Payment Link → webhook PAID (idempotent)
- Demo OTP, production / live boot guards
- WhatsApp HMAC webhooks, payment + OTP templates
- Per-merchant Razorpay (encrypted at rest)
- Optional LLM parser, pending phone capture, reminders
- Recurring plans, richer analytics, invoice numbers (`PB-YYYYMMDD-…`)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unable to connect to PayBot` | API down / restart mid-request | Keep `backend` `npm run dev` running; hard refresh |
| `DBPathInUse` on `db:local` | Mongo already on `:27017` | Do **not** start a second `db:local` |
| Port `5173` busy | Extra Vite process | Use the running app or free the port |
| DEMO PAY badge | `DEMO_MODE=true` | Expected until live enable + webhook |
| OTP only for one number | Meta allowlist | API Setup → **To** → add number (max ~5) |
| OTP API OK but phone empty | No 24h session / free-text | Message Meta test number `hi`, then Resend; or Auth template |
| `#131030` in API logs | Number not allowlisted | Add recipient in Meta |
| Live boot exits | Missing keys | `npm run live:check` |
| Secrets “gone” | Pasted into `.env.example` | Put secrets in `backend/.env` only |

---

## Security notes

- Never commit `backend/.env`
- Never put tokens in `.env.example`
- Frontend never receives Razorpay secrets
- Live PAID status requires verified webhook HMAC
- Rotate Meta temporary access tokens when they expire (~24h for temp tokens)
