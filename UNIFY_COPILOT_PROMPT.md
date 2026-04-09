# UNIFY — GitHub Copilot Master Prompt

## WHO YOU ARE AND WHAT THIS PROJECT IS

You are working on **UNIFY** — a universal search engine that queries multiple free public APIs
simultaneously and shows all results in one clean interface. The repo is:
https://github.com/jaisankarpeddiboyina-creator/UNIFY

The architecture is simple and must stay simple:
- Backend: Node.js + Express
- Frontend: React (Create React App)
- One big JSON file (`backend/data/apis_production_ready.json`) holds all 1123 API definitions
- Adding a new category must ONLY require: editing that JSON file + one entry in `categories.js`
- Zero other files should need to change when adding a category

---

## EXACT FILE STRUCTURE (do not change this structure)

```
unify/
  backend/
    data/
      apis_production_ready.json   ← 1123 API definitions, the source of truth
    src/
      server.js                    ← Express app, helmet, cors, morgan, graceful shutdown
      config/
        categories.js              ← List of active categories with knownAPI anchor
      apis/
        fetcher.js                 ← API selection + HTTP calling engine
        extractor.js               ← Normalises raw API responses into unified shape
      routes/
        search.js                  ← GET /api/search and GET /api/categories
    package.json
    .env                           ← PORT, ALLOWED_ORIGIN, timeouts, rate limits
    .env.example
  frontend/
    public/
      index.html
      manifest.json
      sw.js
    src/
      index.js
      index.css
      pages/
        App.jsx                    ← Root component, loads categories, owns state
      components/
        Navbar.jsx                 ← Search bar
        Sidebar.jsx                ← Category tabs
        ResultsGrid.jsx            ← Grid of cards
        ResultCard.jsx             ← Single result (image or quote)
        DownloadButton.jsx         ← Download as JSON or TXT
        ShareButton.jsx            ← Multi-platform share
        ErrorBoundary.jsx          ← Catches React crashes
      hooks/
        useSearch.js               ← Fetch logic with AbortController
    package.json
```

---

## THE API REGISTRY — CRITICAL FACTS YOU MUST KNOW

File: `backend/data/apis_production_ready.json`

**Current state of the data:**
- 1123 total API entries
- Only ~14 entries are currently "active" (have `callType`, `extractorType`, `queryTemplate` filled in)
- The rest are skeleton entries — they have `name`, `category`, `url` but `callType: null`,
  `extractorType: null`, `queryTemplate: null`
- These skeleton entries are waiting to be completed as new categories are activated
- The fetcher filters by `api.queryTemplate` so skeleton entries are safely ignored

**Shape of a FULLY CONFIGURED API entry (ready to use):**
```json
{
  "name": "Quotable",
  "category": "quotes_motivation",
  "url": "https://api.quotable.io",
  "queryTemplate": "https://api.quotable.io/search/quotes?query={query}&limit=5",
  "callType": "json",
  "extractorType": "quotable",
  "searchable": true,
  "auth": "none",
  "cors": "yes",
  "description": "Search quotes by keyword"
}
```

**Shape of a SKELETON entry (not yet active):**
```json
{
  "name": "SomeAPI",
  "category": "music",
  "url": "https://someapi.com",
  "queryTemplate": null,
  "callType": null,
  "extractorType": null,
  "searchable": null,
  "auth": "none",
  "cors": "unknown",
  "description": ""
}
```

**Field rules:**
- `callType`: must be `"json"` or `"direct_image"` (never null for active APIs)
- `extractorType`: must exactly match a function name in `extractor.js`
- `searchable: true` → replace `{query}` in queryTemplate with encoded search term
- `searchable: false` → use queryTemplate as-is (random/trending endpoint)
- `callType: "direct_image"` → the queryTemplate URL IS the image, no HTTP fetch needed

**Currently active extractorTypes** (these functions already exist in extractor.js):
- `direct_image` — for image URL APIs
- `quotable` — for Quotable API
- `adviceslip` — for Advice Slip API
- `zenquotes` — for Zen Quotes API
- `affirmations` — for Affirmations API
- `forismatic` — for Forismatic API (special: malformed JSON handling needed)
- `_fallback` — catches anything with no matching extractor

---

## THE ENGINE RULES (never break these)

```
1. MAX 5 API calls per search (env: MAX_API_CALLS)
2. The "knownAPI" from categories.js is ALWAYS included (anchor — guarantees ≥1 result)
3. Remaining slots (up to 4) are filled randomly from other APIs in the same category
4. Only APIs where queryTemplate is non-null are eligible
5. All calls run in parallel via Promise.allSettled() — one failure never blocks others
6. Each call has an 8 second timeout (env: API_TIMEOUT_MS)
7. Failed/timed-out APIs are silently skipped
8. All results are normalised to the same shape (see below)
9. Duplicate results are deduplicated by normalised title (lowercase, trimmed)
10. apiRegistry is NEVER on global — always passed via req.app.locals.API_REGISTRY
```

**Normalised result shape (every category, every API produces this):**
```json
{
  "id": "uuid-v4",
  "title": "string — main text or image description",
  "description": "string — subtitle, author, caption, or empty string",
  "source": "string — API name",
  "category": "string — category id",
  "url": "string or null — link to original",
  "imageUrl": "string or null — direct image URL, null for non-image results",
  "metadata": {}
}
```

---

## WHAT IS BROKEN AND MUST BE FIXED

### FIX 1 — Default data before search (Priority: HIGH)
**Problem:** App shows "Search something to get started" on load. Should auto-load results.
**Fix:** When a category is selected (including on first load), call `search(categoryId, "")` with
an empty/trending query. Each category's `knownAPI` should have a `defaultQuery` field in
`categories.js` (e.g. `"defaultQuery": "nature"` for images, `"defaultQuery": "life"` for quotes).
Use that defaultQuery to auto-populate results on load and on category switch.

**In `categories.js` add `defaultQuery` to each entry:**
```js
{ id: 'images', displayName: 'Images', knownAPI: 'Pollinations AI Image',
  icon: '🖼️', description: '...', defaultQuery: 'nature' }
```

**In `App.jsx`:** when `selectedCategory` changes (including on first mount after categories load),
call `search(selectedCategory, defaultQuery)` automatically if the user has not typed anything.

### FIX 2 — Show More / Pagination (Priority: HIGH)
**Problem:** Only ~5 results shown. No way to get more.
**Fix:** Add a `page` parameter to the search. Backend accepts `?page=1` (1-indexed).
Each page re-runs the engine with a freshly shuffled random API selection (the randomness
naturally produces different results on each page). Frontend shows a "Show More" button
below the results grid. Clicking it calls `search(category, query, page + 1)` and
APPENDS new results to the existing array (does not replace).

- Backend: `GET /api/search?category=images&q=sunset&page=2`
- Frontend `useSearch`: add `page` param, on page > 1 append to results instead of replacing
- `ResultsGrid`: show "Show More" button at bottom if `count >= 3` (means there's likely more)
- Do not show "Show More" if results came back empty

### FIX 3 — Share Button — Multi-platform (Priority: MEDIUM)
**Problem:** Share just copies URL to clipboard. Need real platform options.
**Fix:** Replace ShareButton with a share panel that appears on click:

```
┌─────────────────────┐
│ 📋 Copy Link        │
│ 🐦 Share on X       │
│ 💬 Share on WhatsApp│
│ ✈️  Share on Telegram│
│ 📱 More... (native) │
└─────────────────────┘
```

- Copy Link: clipboard API with execCommand fallback (already fixed)
- X/Twitter: `https://twitter.com/intent/tweet?text=...`
- WhatsApp: `https://api.whatsapp.com/send?text=...`
- Telegram: `https://t.me/share/url?url=...&text=...`
- "More..." button: use `navigator.share()` Web Share API if available (mobile native share)
- The panel opens as an absolute-positioned dropdown on the card, closes on outside click
- For image results: share the imageUrl. For quotes: share `"quote text" — author`

### FIX 4 — API Algorithm Hardening (Priority: HIGH — this is the engine)
**Problem:** Several silent failure points in fetcher.js and extractor.js.

**In `fetcher.js`:**
- Use `Promise.allSettled()` instead of `Promise.all()` — currently one network-level
  exception (not just HTTP error) can crash the whole batch
- After selecting APIs, log to console which ones were selected:
  `console.log('[UNIFY] category=%s query=%s selected=%s', categoryId, query, selected.map(a=>a.name).join(', '))`
- After receiving results, log success/failure per API:
  `console.log('[UNIFY] %s → %s', result.apiName, result.success ? 'OK' : result.error)`

**In `extractor.js`:**
- When `extractorType` has no matching function AND it's not `_fallback`, log a warning:
  `console.warn('[UNIFY] No extractor for type "%s" (API: %s) — using fallback', extractorType, result.apiName)`
- This warning tells you exactly which extractor function needs to be added when activating a new category

**In `server.js` startup validation:**
Add this check when loading the registry — runs once at boot, costs nothing at runtime:
```js
const activeAPIs = API_REGISTRY.filter(a => a.queryTemplate);
const missingExtractors = [...new Set(
  activeAPIs.map(a => a.extractorType).filter(t => t && !extractors[t])
)];
if (missingExtractors.length > 0) {
  console.error('[UNIFY] STARTUP ERROR: Missing extractor functions:', missingExtractors);
  console.error('[UNIFY] Add these to extractor.js before these APIs will work.');
}
```
Import the `extractors` object from extractor.js to do this check.

**In `routes/search.js`:**
- Validate that `knownAPI` from the category config actually exists in the registry before running:
  ```js
  const knownAPIEntry = apiRegistry.find(a => a.name === categoryConfig.knownAPI && a.queryTemplate);
  if (!knownAPIEntry) {
    console.warn('[UNIFY] knownAPI "%s" not found or has no queryTemplate', categoryConfig.knownAPI);
  }
  ```
  Continue anyway — this is a warning, not a crash. The random APIs will still run.

### FIX 5 — Results clear when switching category (Priority: LOW)
**Problem:** Old results briefly flash when switching categories.
**Fix:** In `useSearch.js`, call `setResults([])` immediately when a new search starts
(before the await). Already happens via `setLoading(true)` but results stay visible.
Add `setResults([])` right after `setLoading(true)`.

### FIX 6 — Mobile search keyboard (Priority: LOW)
**Problem:** Mobile keyboard doesn't show search button.
**Fix:** Add `inputMode="search"` and `enterKeyHint="search"` to the search input in `Navbar.jsx`.

---

## HOW TO ADD A NEW CATEGORY — THE EXACT PROCESS

This is the most important section. Follow this process forever — it must never require
editing anything other than these two things:

### Step 1 — In `apis_production_ready.json`, find skeleton entries for your category
Look for entries where `category` matches your new category id.
Fill in the required fields for at least 2 APIs (one will be the knownAPI anchor):
```json
{
  "name": "iTunesSearch",
  "category": "music",
  "url": "https://itunes.apple.com",
  "queryTemplate": "https://itunes.apple.com/search?term={query}&entity=song&limit=5",
  "callType": "json",
  "extractorType": "itunes",
  "searchable": true,
  "auth": "none",
  "cors": "yes"
}
```

### Step 2 — Add extractor function to `extractor.js` IF needed
If your `extractorType` (e.g. `"itunes"`) doesn't already exist:
```js
extractors.itunes = (data, apiName, callUrl, query, category) => {
  const items = data?.results || [];
  return items.map(item => ({
    id: uuidv4(),
    title: item.trackName || item.collectionName || '',
    description: item.artistName || '',
    source: apiName,
    category,
    url: item.trackViewUrl || null,
    imageUrl: item.artworkUrl100 || null,
    metadata: { genre: item.primaryGenreName || '' }
  }));
};
```

### Step 3 — Add ONE entry to `categories.js`
```js
{
  id: 'music',
  displayName: 'Music',
  knownAPI: 'iTunesSearch',      ← must EXACTLY match the "name" field in the JSON
  icon: '🎵',
  description: 'Songs, albums, artists',
  defaultQuery: 'pop'            ← shown on load before user searches
}
```

### Step 4 — That's it. Nothing else changes.
The sidebar, search, results, cards, download, share — all update automatically.
The startup validator will log an error if you forgot to add an extractor.

---

## WHAT MUST NEVER CHANGE (the stable contracts)

1. The normalised result shape — `{ id, title, description, source, category, url, imageUrl, metadata }`
   Every extractor must produce this. The frontend only knows this shape.

2. The engine rules (5 APIs max, knownAPI always included, parallel with timeout)

3. `req.app.locals.API_REGISTRY` — never use `global`

4. `GET /api/search?category=X&q=Y` response shape:
   `{ category, query, count, results: [...] }`

5. `GET /api/categories` response shape:
   `[{ id, displayName, icon, description }]`

---

## CURRENT PACKAGE VERSIONS (do not upgrade without testing)

Backend dependencies:
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0",
  "node-fetch": "^2.7.0",
  "uuid": "^9.0.0",
  "express-rate-limit": "^7.1.5",
  "dotenv": "^16.3.1"
}
```
Frontend: React 18.2, react-scripts 5.0.1. No other dependencies needed.
Node.js minimum version: 18.

---

## THINGS COPILOT MUST NEVER DO

- Never put API keys or secrets in any file
- Never use `global.anything` — use `req.app.locals` or module exports
- Never change the normalised result shape
- Never make the frontend aware of specific API names or extractorTypes
- Never add a new npm package without a clear reason
- Never change the folder structure
- Never remove the AbortController in useSearch.js (it prevents race conditions)
- Never use `Promise.all` in fetcher.js — use `Promise.allSettled`
- Never `console.log` request bodies or query strings in production (leaks user data)
- Never return `err.message` or stack traces to the HTTP client
- Never hardcode any URLs, timeouts, or limits — they all live in `.env`

---

## ENVIRONMENT VARIABLES (all in .env)

```
PORT=5000
ALLOWED_ORIGIN=http://localhost:3000
API_TIMEOUT_MS=8000
MAX_API_CALLS=5
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
```

---

## HOW TO RUN LOCALLY

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev      # nodemon, auto-restarts on changes, port 5000

# Terminal 2 — Frontend
cd frontend
npm install
npm start        # CRA dev server, port 3000, proxies /api/* to port 5000
```

Health check: `GET http://localhost:5000/health`
Should return: `{ "status": "ok", "apisLoaded": 1123 }`

---

## SUMMARY OF ALL PROBLEMS TO SOLVE IN ORDER

1. **[ENGINE]** Replace `Promise.all` with `Promise.allSettled` in `fetcher.js`
2. **[ENGINE]** Add startup validator in `server.js` that checks for missing extractors
3. **[ENGINE]** Add console logging in fetcher (which APIs selected, which succeeded/failed)
4. **[FEATURE]** Add `defaultQuery` to `categories.js`, auto-load results on category select
5. **[FEATURE]** Add `page` param to search — "Show More" appends results, doesn't replace
6. **[FEATURE]** Replace ShareButton with multi-platform share panel (X, WhatsApp, Telegram, native)
7. **[BUG]** Clear results array immediately when a new search starts in `useSearch.js`
8. **[BUG]** Add `inputMode="search"` and `enterKeyHint="search"` to search input in `Navbar.jsx`

Solve them in this order. Do not mix fixes. Each fix must be a clean, isolated change
that does not affect the others.
