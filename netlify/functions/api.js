import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

const app = express();

app.use(cors());
app.use(express.json());

const getEnv = (name, legacyName) => process.env[name] || process.env[legacyName];

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/weather', async (req, res) => {
  const apiKey = getEnv('OPEN_WEATHER_API', 'VITE_OPEN_WEATHER_API');
  const city = req.query.city || 'Detroit';
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPEN_WEATHER_API environment variable.' });
  }

  try {
    let weatherUrl;

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&units=imperial&appid=${apiKey}`;
    } else {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(String(city))}&units=imperial&appid=${apiKey}`;
    }

    const response = await fetch(weatherUrl);

    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch weather data.',
        details: payload?.message || 'Unknown weather API error.'
      });
    }

    return res.status(200).json(payload);
  } catch (_error) {
    return res.status(500).json({ error: 'Unexpected weather API error.' });
  }
});

app.get('/news', async (req, res) => {
  const apiKey = getEnv('NEWS_API', 'VITE_NEWS_API');
  const country = req.query.country || 'us';

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing NEWS_API environment variable.' });
  }

  try {
    const query = new URLSearchParams({
      country: String(country),
      pageSize: '5',
      apiKey
    });

    const response = await fetch(`https://newsapi.org/v2/top-headlines?${query.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch news data.',
        details: payload?.message || 'Unknown news API error.'
      });
    }

    return res.status(200).json(payload);
  } catch (_error) {
    return res.status(500).json({ error: 'Unexpected news API error.' });
  }
});

export const handler = serverless(app, {
  basePath: '/api'
});

if (process.env.LOCAL_API_DEV === '1') {
  const port = Number(process.env.API_PORT || 8787);
  app.listen(port, () => {
    console.log(`Local API server listening on http://localhost:${port}`);
  });
}
