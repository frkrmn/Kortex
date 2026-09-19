import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { liveApi } from './live-api';
import { finishLiveXOAuth } from './sources/x-live';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.use((req, res) => {
  // The rewrite passes the original path explicitly. Keep the query string for
  // the OAuth callback, and remove the internal routing parameter.
  const url = new URL(req.url, 'http://localhost');
  const rawPath = url.searchParams.get('__path');
  url.searchParams.delete('__path');
  const route = rawPath ? `/${rawPath.replace(/^\/+/, '')}` : url.pathname.replace(/^\/api/, '');
  req.url = `${route || '/'}${url.search}`;
  res.setHeader('Cache-Control', 'no-store');

  if (route === '/health' && req.method === 'GET') {
    res.json({ status: 'ok', time: new Date().toISOString() });
    return;
  }
  if (route === '/integrations/x/callback' && req.method === 'GET') {
    void finishLiveXOAuth(req, res).catch(error => {
      console.error('X callback failure:', error);
      if (!res.headersSent) res.status(500).send('X connection failed.');
    });
    return;
  }
  void liveApi(req, res).catch(error => {
    console.error('Live API failure:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Request failed.' });
  });
});

export default app;
