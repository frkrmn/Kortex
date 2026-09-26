import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { liveApi } from './live-api';
import { finishLiveXOAuth } from './sources/x-live';
import { LiveStripeService } from './economics/live-stripe';
import { SmartSyncService } from './economics/smart-sync';
import { enrichmentControls, runControlledGeminiEnrichment } from './ai/live-gemini-enrichment';
import { ProviderBudgetService } from './economics/provider-budget';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use((req, res, next) => {
  const route = new URL(req.url, 'http://localhost').searchParams.get('__path');
  if (route === 'billing/webhook' || req.path === '/billing/webhook') return express.raw({ type: 'application/json', limit: '100kb' })(req, res, next);
  next();
});
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
  if (route === '/billing/webhook' && req.method === 'POST') {
    const signature = req.get('stripe-signature');
    if (!signature || !Buffer.isBuffer(req.body)) { res.status(400).json({ error: 'Invalid webhook.' }); return; }
    void LiveStripeService.webhook(req.body, signature).then(result => res.json(result)).catch(error => {
      console.error('Stripe webhook failure:', error);
      if (!res.headersSent) res.status(400).json({ error: 'Webhook rejected.' });
    });
    return;
  }
  if (route === '/internal/smart-sync' && req.method === 'GET') {
    if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized.' }); return;
    }
    void SmartSyncService.run().then(result => res.json(result)).catch(error => {
      console.error('Smart Sync failure:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Smart Sync failed.' });
    });
    return;
  }
  if (route === '/internal/gemini-enrichment' && req.method === 'GET') {
    if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized.' }); return;
    }
    const controls = enrichmentControls();
    if (!controls.enabled || controls.rolloutCap === 0) { res.json({ enabled: false, attempted: 0 }); return; }
    void runControlledGeminiEnrichment().then(result => res.json(result)).catch(() => {
      if (!res.headersSent) res.status(503).json({ error: 'Controlled enrichment unavailable.' });
    });
    return;
  }
  if (route === '/internal/provider-metrics' && req.method === 'GET') {
    if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      res.status(401).json({ error: 'Unauthorized.' }); return;
    }
    void ProviderBudgetService.getInternalMetrics().then(result => res.json(result)).catch(error => {
      console.error('Provider metrics failure:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Metrics unavailable.' });
    });
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
