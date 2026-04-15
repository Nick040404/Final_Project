# Dashboard App (Vite + React + Netlify Functions)

This project now uses an Express backend deployed as a Netlify Function so browser code does not call third-party APIs directly.

## API Routes

- `GET /api/weather?city=Detroit`
- `GET /api/news?country=us`
- `GET /api/health`

`/api/*` is redirected to `netlify/functions/api.js` through `netlify.toml`.

## Environment Variables (Netlify)

Set these in Netlify site settings:

- `OPEN_WEATHER_API`
- `NEWS_API`

The backend reads these server-side values and forwards requests to the external APIs.

## Local Development

- Frontend: `npm run dev`
- Production build: `npm run build`

For full local function routing (`/api/*`), run with Netlify CLI (`netlify dev`) if installed.
