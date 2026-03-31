# I'm Broke — Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Mapbox](https://mapbox.com) account (free tier: 50k map loads/month)

---

## 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run these scripts in order:
   ```
   database/schema.sql
   database/schema_extras.sql
   database/seed.sql        ← optional demo data
   ```
3. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (keep secret!)

---

## 2. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Get Mapbox token:**
1. Sign up at [mapbox.com](https://mapbox.com)
2. Go to Account → Tokens → Create a token
3. Paste the `pk.xxx` token above

```bash
npm install
npm run dev        # http://localhost:3000
```

---

## 3. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
playwright install chromium

cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Telegram (optional but recommended)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef
# Generate session: python -c "from telethon.sync import TelegramClient; c = TelegramClient('s', API_ID, API_HASH); c.start(); print(c.session.save())"
TELEGRAM_SESSION_STRING=your_session_string

# Instagram (optional)
INSTAGRAM_ACCESS_TOKEN=your_token

CORS_ORIGINS=http://localhost:3000
ADMIN_SECRET=change_me
```

```bash
uvicorn main:app --reload   # http://localhost:8000
# API docs: http://localhost:8000/docs
```

---

## 4. Telegram Setup (Optional)

1. Go to [my.telegram.org](https://my.telegram.org) → API development tools
2. Create an app → get `api_id` and `api_hash`
3. Generate a session string (one-time, run locally):
   ```bash
   cd backend
   python -c "
   from telethon.sync import TelegramClient
   import os
   c = TelegramClient('session', int(os.environ['TELEGRAM_API_ID']), os.environ['TELEGRAM_API_HASH'])
   c.start()
   print('Session:', c.session.save())
   c.disconnect()
   "
   ```
4. Paste the session string into `.env`

---

## 5. Instagram Setup (Optional)

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → Add "Instagram Basic Display" product
3. Follow the OAuth flow to get a long-lived access token
4. Paste into `.env` as `INSTAGRAM_ACCESS_TOKEN`
5. Add account IDs to `backend/app/scrapers/instagram_scraper.py → INSTAGRAM_ACCOUNTS`

---

## 6. Geocode Seed Data

After seeding the database, geocode deals that are missing coordinates:
```bash
cd backend
python ../database/geocode_seed.py
```

---

## 7. Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
# Set env vars in Vercel dashboard
```

### Backend → Railway or Render
- Connect your GitHub repo
- Set root directory to `backend/`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add all `.env` variables in the dashboard

---

## Architecture Overview

```
Public Sources → Scrapers (Python) → NER/ML Pipeline → Supabase (PostGIS)
                                                               ↓
Browser ← Next.js frontend ← FastAPI REST API ─────────────────
```

### Data flow
1. **Scrapers** run every 2–4 hours (APScheduler)
2. **NER pipeline** extracts store name, expiry, location from raw text
3. **Classifier** filters out spam / off-topic messages
4. **Quality scorer** assigns 0–100 score based on engagement + completeness
5. **PostGIS** enables "within 2km" geo queries
6. **FastAPI** serves structured JSON to the frontend
7. **Next.js** renders the map (Mapbox GL) + deal cards
