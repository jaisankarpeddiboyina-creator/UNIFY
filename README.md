# UNIFY

**Find Anything. Instantly.**

A generic search engine that queries multiple free public APIs simultaneously and displays unified results in one clean interface.

## MVP Categories
- 🖼️ **Images** — AI-generated (Pollinations) + curated photos (Picsum, LoremFlickr, Robohash)
- 💬 **Quotes** — Quotable, Advice Slip, Zen Quotes, Affirmations, Forismatic

## Setup

```bash
# 1. Backend
cd backend
npm install
npm run dev        # runs on http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm start          # runs on http://localhost:3000
```

`/api/*` calls proxy automatically to the backend during development.

## Adding a New Category

1. Add API entries to `backend/data/apis_production_ready.json` with `queryTemplate`, `extractorType`, `callType`, `searchable`
2. If new `extractorType`, add one function to `backend/src/apis/extractor.js`
3. Add one entry to `backend/src/config/categories.js`

Zero other changes needed. The sidebar, search, and cards update automatically.

## Architecture

```
Engine rules (never change):
- Max 5 API calls per search
- Known "anchor" API always included (guarantees ≥1 result)
- Remaining slots filled randomly (different mix every search)
- All calls parallel via Promise.all() with 8s timeout
- Failed APIs silently skipped
- All results normalised to same shape
- Duplicate results deduplicated by title
```

## Testing Checklist (Section 13 of spec)

- [ ] `GET /health` returns `{ status: "ok", apisLoaded: 1123 }`
- [ ] `GET /api/categories` returns 2 categories
- [ ] `GET /api/search?category=images&q=sunset` returns 3–5 results with `imageUrl`
- [ ] `GET /api/search?category=quotes_motivation&q=success` returns results with `title`
- [ ] Image cards load visible images
- [ ] Broken image triggers Picsum fallback
- [ ] Quote cards show blockquote text and author
- [ ] Download JSON saves `.json` file
- [ ] Download TXT saves `.txt` file
- [ ] Share button copies text and shows `✓ Copied`
- [ ] Duplicate quotes shown only once
- [ ] 10+ rapid searches from same IP gets rate-limited with friendly message
- [ ] `GET /robots.txt` returns valid robots file
- [ ] Mobile: sidebar becomes horizontal scrollable tabs
- [ ] Switching category re-runs search in new category
- [ ] One broken API doesn't block other results
- [ ] PWA installable from Chrome menu
