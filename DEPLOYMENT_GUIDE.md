# Al Noor Gold — Complete Deployment & Integration Guide

---

## PART 1 — WHAT YOU NEED TO FILL IN (API Keys & Config)

Every API key/config lives in **one place per file** at the top of each `<script>` block.

### customer.html / staff.html / admin.html — Variables to Replace

| Variable | Where to Get It | Notes |
|---|---|---|
| `GOLD_API_KEY` | goldapi.io — free plan | See Part 2 |
| `TG_TOKEN` | BotFather on Telegram | See Part 3 |
| `TG_CHAT` | @userinfobot on Telegram | See Part 3 |
| `N8N_BASE` | Your n8n cloud URL | See Part 4 |
| Claude API Key | console.anthropic.com | See Part 5 — NOT in files, goes in Netlify env |

---

## PART 2 — GOLD API SETUP

1. Go to **https://www.goldapi.io** → Sign Up (free plan = 500 req/month)
2. Dashboard → copy your **Access Token** (looks like `goldapi-xxxxxxxxxxxx-io`)
3. Free plan fetches OMR rates via URL: `https://www.goldapi.io/api/XAU/OMR`
   - `XAU` = gold, `OMR` = Omani Rial
   - For UAE (AED): change to `https://www.goldapi.io/api/XAU/AED`
   - For Saudi (SAR): `https://www.goldapi.io/api/XAU/SAR`
   - For Qatar (QAR): `https://www.goldapi.io/api/XAU/QAR`
4. Paste your key into `GOLD_API_KEY` in all three HTML files

---

## PART 3 — TELEGRAM BOT SETUP (Step-by-Step)

### 3.1 Create the Bot
1. Open Telegram → search **@BotFather** → click Start
2. Send: `/newbot`
3. Give it a name: `Al Noor Gold Notifications`
4. Give it a username: `alnoor_gold_bot` (must end in `bot`)
5. BotFather sends you a token like: `1234567890:ABCDxxxxxxxxxxxxxxxxxxxx`
6. This is your `TG_TOKEN` — paste into all three HTML files

### 3.2 Get the Chat ID (for a Group — Recommended)
1. Create a Telegram group (e.g. "Al Noor Orders")
2. Add your bot to the group
3. Send any message in the group
4. Open browser and visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
5. Find `"chat":{"id":-XXXXXXXXX}` — the negative number is your group Chat ID
6. Paste this (including the minus sign) as `TG_CHAT` in all three HTML files

### 3.3 Get Chat ID (for Personal DM — Simpler)
1. Search **@userinfobot** on Telegram → Start
2. It replies with your numeric ID (e.g. `123456789`)
3. Use that as `TG_CHAT`

### 3.4 What You'll Receive in Telegram

**New Order (from customer.html):**
```
🛒 NEW ORDER — ORD-847291
👤 Ahmed Al Balushi | 📞 +968 9123 4567
💍 22K Gold Ring (22K, 5g) · rings
📍 Muscat, Al Khuwair
💰 52.318 OMR
⏰ 6/6/2025, 10:30:00 AM
```

**Status Update (from staff.html):**
```
⚙️ Order ORD-847291 → PROCESSING
👤 Ahmed Al Balushi · 📞 +968 9123 4567
💍 22K Gold Ring
⏰ 6/6/2025, 11:00:00 AM
```

---

## PART 4 — n8n + GOOGLE SHEETS SETUP

n8n is the automation layer. It receives order data from your HTML files and saves it to Google Sheets.

### 4.1 Sign Up for n8n Cloud (Free)
1. Go to **https://app.n8n.cloud** → Sign Up
2. Free plan: 5 active workflows, 2,500 executions/month — enough to start
3. Your base URL will be: `https://YOUR-SUBDOMAIN.app.n8n.cloud`
4. Paste this into `N8N_BASE` in all three HTML files

### 4.2 Create the Google Sheet

Create a Google Sheet with these exact columns (Row 1 = headers):

**Sheet name: "Orders"**
```
Column A: orderId
Column B: name
Column C: phone
Column D: item
Column E: karat
Column F: weight
Column G: category
Column H: address
Column I: total
Column J: status
Column K: timestamp
Column L: branch
```

**Sheet name: "OrderUpdates"**
```
Column A: orderId
Column B: newStatus
Column C: updatedAt
```

### 4.3 Build the "Save Order" Workflow in n8n

1. In n8n → New Workflow → Name: "Save Order"
2. Add node: **Webhook**
   - HTTP Method: POST
   - Path: `save-order`
   - Authentication: None (for now)
   - Click **Listen for Test Event**
3. Add node: **Google Sheets** → Append Row
   - Connect your Google account when prompted
   - Select your Spreadsheet
   - Select sheet: "Orders"
   - Map columns:
     - `orderId` → `{{ $json.orderId }}`
     - `name` → `{{ $json.name }}`
     - `phone` → `{{ $json.phone }}`
     - `item` → `{{ $json.item }}`
     - `karat` → `{{ $json.karat }}`
     - `weight` → `{{ $json.weight }}`
     - `category` → `{{ $json.category }}`
     - `address` → `{{ $json.address }}`
     - `total` → `{{ $json.total }}`
     - `status` → `pending`
     - `timestamp` → `{{ $json.timestamp }}`
     - `branch` → `{{ $json.branch || "Walk-in" }}`
4. (Optional) Add **Telegram node** as second step:
   - Token: your bot token
   - Chat ID: your group ID
   - Text: `🛒 NEW ORDER {{ $json.orderId }} — {{ $json.name }} · {{ $json.total }} OMR`
5. Click **Save** → Toggle workflow **Active**
6. The webhook URL will be: `https://YOUR-SUBDOMAIN.app.n8n.cloud/webhook/save-order`

### 4.4 Build the "Update Order Status" Workflow

1. New Workflow → Name: "Update Order Status"
2. Webhook node: Path = `update-order`, Method = POST
3. Google Sheets node → **Update Row**
   - Find row where Column A (orderId) = `{{ $json.orderId }}`
   - Update Column J (status) = `{{ $json.status }}`
   - Update Column K (updatedAt) = `{{ $json.updatedAt }}`
4. Save → Activate

### 4.5 Build the "Get Orders for Staff" Workflow

1. New Workflow → Name: "Staff Orders"
2. Webhook node: Path = `staff-orders`, Method = GET
3. Google Sheets node → **Get All Rows** from "Orders" sheet
4. Set node → format the data as array
5. Respond to Webhook node → return the array as JSON
6. Save → Activate

### 4.6 Connecting Google Sheets to n8n

When you first add a Google Sheets node:
1. Click **Add Credential**
2. Choose **OAuth2** → Follow the Google sign-in flow
3. Grant access to Google Sheets
4. Select your specific spreadsheet by ID (found in the sheet URL: `docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`)

---

## PART 5 — CLAUDE API KEY SETUP

The Claude API key should **never be exposed in client-side HTML** — it would be visible to anyone who views source.

### Safe Setup via Netlify Functions (Recommended)

1. Create a file: `netlify/functions/claude-proxy.js`
```javascript
const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  
  const body = JSON.parse(event.body);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
};
```

2. In Netlify Dashboard → Site Settings → Environment Variables:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-xxxxxxxxxxxxxxxxx` (from console.anthropic.com)

3. In your HTML files, change the Claude fetch URL from:
   `https://api.anthropic.com/v1/messages`
   to:
   `/.netlify/functions/claude-proxy`
   (Remove the API key header from the fetch call — the proxy handles it)

### Quick Test (Temporary — Dev Only)
For testing only, you can add your key directly:
```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'sk-ant-YOUR_KEY_HERE',
  'anthropic-version': '2023-06-01'
}
```
⚠️ Remove this before going public!

---

## PART 6 — ADDING ITEMS TO THE CATALOG

The catalog is defined in `customer.html` in the `CATALOG_ITEMS` object.

### Current Structure
```javascript
const CATALOG_ITEMS = {
  rings: [
    {
      name: "Classic Solitaire Ring",  // Display name
      w: 4.2,                          // Weight in grams
      k: 22,                           // Karat (18, 22, or 24)
      img: "https://..."               // Image URL
    },
    // Add more rings here...
  ],
  necklaces: [...],
  bracelets: [...],
  earrings:  [...],
  bangles:   [],   // Add items here
  pendants:  []    // Add items here
};
```

### Adding a New Item
1. Find the right category array in `CATALOG_ITEMS`
2. Add a new object:
```javascript
{
  name: "Diamond Cut Bangle",
  w: 12.5,          // actual weight in grams
  k: 22,            // 18, 22, or 24
  img: "https://images.unsplash.com/photo-XXXXXXXX?w=300&q=80"
}
```

### Getting Free Product Images
- **Unsplash**: https://unsplash.com/s/photos/gold-jewelry (free, no attribution required)
  - Click image → Download → right-click → Copy Image URL
  - Add `?w=300&q=80` at end for optimized size
- **Pexels**: https://www.pexels.com/search/gold%20jewelry/
- **Your own photos**: Upload to Cloudinary (free) → get CDN URL

### Prices Are Calculated Automatically
You do NOT manually enter prices. The system calculates:
```
Price = (gold_rate × weight) + (making_charge × weight) + 5% VAT
```
Making charges per gram (edit in config at top of each file):
- Rings: 2.5 OMR/g
- Necklaces: 3.0 OMR/g
- Bracelets: 2.8 OMR/g
- Earrings: 2.2 OMR/g
- Bangles: 2.0 OMR/g
- Pendants: 2.5 OMR/g

---

## PART 7 — DEPLOYING TO NETLIFY (FREE)

Netlify's free plan: unlimited sites, 100GB bandwidth/month, custom domain.

### Method A — Drag & Drop (Easiest, 2 minutes)
1. Go to **https://app.netlify.com** → Sign Up
2. Dashboard → drag your project folder onto the page
3. Netlify gives you a URL like `https://random-name.netlify.app`
4. Done! Share that URL.

### Method B — GitHub + Auto Deploy (Recommended for ongoing updates)
1. Create a GitHub account if you don't have one
2. Create a new repository: `al-noor-gold`
3. Upload all your HTML files + config.js to the repo
4. In Netlify → "Import from Git" → Connect GitHub → Select your repo
5. Build settings: leave blank (static site, no build needed)
6. Click Deploy
7. Every time you push changes to GitHub, Netlify auto-redeploys

### Custom Domain (Optional, Free)
1. Buy a domain from Namecheap or GoDaddy (~$10/year)
   - Suggested: `alnoor.gold` or `alnoor-gold.com`
2. Netlify → Domain Management → Add custom domain
3. Follow DNS instructions (point your domain's nameservers to Netlify)
4. Netlify auto-generates a free SSL certificate (HTTPS)

### Netlify Environment Variables (for Claude API key)
1. Netlify Dashboard → Your Site → Site Configuration → Environment Variables
2. Add: `ANTHROPIC_API_KEY` = `sk-ant-xxxx`
3. Redeploy

---

## PART 8 — READING ORDER DETAILS IN TELEGRAM & SHEETS

### In Telegram
Every order notification contains the full order details. To search/filter:
- Pin important orders in your group
- Use Telegram's search (Ctrl+F in desktop app) to find by customer name
- Use bot commands — you can extend the bot to respond to `/orders` if needed later

### In Google Sheets
Your Orders sheet will fill up automatically. Useful things to do:

**Filter by Status:**
1. Click on Column J (status) header
2. Data → Create a Filter
3. Click the filter icon → uncheck statuses you don't want to see

**Color-code by Status:**
1. Select Column J → Format → Conditional Formatting
2. "Text is exactly" → `pending` → Red background
3. "Text is exactly" → `processing` → Yellow background
4. "Text is exactly" → `dispatched` → Green background

**Daily Revenue Formula (add in a new sheet):**
```
=SUMIF(Orders!J:J,"completed",Orders!I:I)
```

**Count Pending Orders:**
```
=COUNTIF(Orders!J:J,"pending")
```

**Today's Orders:**
```
=COUNTIFS(Orders!K:K,">="&TODAY(),Orders!K:K,"<"&TODAY()+1)
```

---

## PART 9 — PASSWORDS & SECURITY

Currently demo passwords are hardcoded in the HTML files. Before going live:

**Staff Portal** — change in `staff.html`:
```javascript
if(u==='staff' && p==='staff123'){  // ← change these
```

**Admin Dashboard** — change in `admin.html`:
```javascript
if(u==='admin' && p==='admin123'){  // ← change these
```

**Recommended for production:** Use a real auth system:
- **Supabase Auth** (free) — https://supabase.com — full email/password auth
- **Netlify Identity** (free) — built into Netlify, easy setup

---

## PART 10 — QUICK CHECKLIST BEFORE GOING LIVE

- [ ] Gold API key replaced in all 3 HTML files
- [ ] Telegram bot created and token replaced
- [ ] Telegram Chat ID found and replaced (test: send a test message via the URL)
- [ ] n8n workflows created and active
- [ ] Google Sheets connected to n8n
- [ ] n8n base URL replaced in all 3 HTML files
- [ ] Claude API key added to Netlify environment variables (not in HTML)
- [ ] Claude fetch URL changed to `/.netlify/functions/claude-proxy`
- [ ] Staff/Admin passwords changed from demo values
- [ ] Custom domain set up (optional)
- [ ] Test: Place a fake order → verify it appears in Telegram AND Google Sheets
- [ ] Test: Staff updates status → verify Telegram notification fires

---

## PART 11 — MAKING IT GCC-WIDE (UAE / Saudi / Qatar)

To change currency from OMR to AED:
1. In all 3 HTML files, change the Gold API URL:
   `https://www.goldapi.io/api/XAU/AED`
2. Search and replace `OMR` with `AED` in all display text
3. Update making charges if different for UAE market (typically higher)

For a multi-currency setup across GCC, add a currency selector to `index.html` and store the selection in `localStorage`.

---

## SUPPORT & NEXT STEPS

- **n8n docs**: https://docs.n8n.io
- **Netlify docs**: https://docs.netlify.com
- **goldapi.io docs**: https://www.goldapi.io/dashboard#docs
- **Telegram Bot API**: https://core.telegram.org/bots/api

**Upgrade path for JewelOS SaaS:**
1. Move catalog to a database (Supabase/Airtable)
2. Add multi-tenant login (one sheet per branch)
3. Add a catalog management UI in admin.html
4. Monetize: charge per branch per month
