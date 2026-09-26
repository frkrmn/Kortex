import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';
import { xSyncEngine } from './server/sources/x-sync-engine';
import { enrichmentPipeline } from './server/ai/enrichment-pipeline';
import { liveApi } from './server/live-api';
import { finishLiveXOAuth } from './server/sources/x-live';
import { LiveStripeService } from './server/economics/live-stripe';
import { SmartSyncService } from './server/economics/smart-sync';
import { enrichmentControls, runControlledGeminiEnrichment } from './server/ai/live-gemini-enrichment';
import { ProviderBudgetService } from './server/economics/provider-budget';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const APP_ORIGIN = process.env.APP_URL || `http://localhost:${PORT}`;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: APP_ORIGIN, credentials: true }));
  app.use('/api/billing/webhook', express.raw({ type: 'application/json', limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
  const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'Too many AI requests, please try again later.' } });
  const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many auth requests, please try again later.' } });
  const destructiveLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { error: 'Rate limit exceeded for this operation.' } });

  app.use('/api/', apiLimiter);
  app.use('/api/integrations/x/auth-url', authLimiter);

  // The file-backed API has a single shared identity. Keep it available only
  // for local development until its handlers use authenticated tenant storage.
  app.use('/api/', (req, res, next) => {
    if (req.path === '/health') return next();
    if (process.env.NODE_ENV === 'production' || process.env.VITE_DEMO_MODE === 'false') {
      if (req.path.replace(/\/$/, '') === '/internal/smart-sync' && req.method === 'GET') {
        if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
          res.status(401).json({ error: 'Unauthorized.' }); return;
        }
        void SmartSyncService.run().then(result => res.json(result)).catch(error => {
          console.error('Smart Sync failure:', error);
          if (!res.headersSent) res.status(500).json({ error: 'Smart Sync failed.' });
        });
        return;
      }
      if (req.path.replace(/\/$/, '') === '/internal/gemini-enrichment' && req.method === 'GET') {
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
      if (req.path.replace(/\/$/, '') === '/internal/provider-metrics' && req.method === 'GET') {
        if (!process.env.CRON_SECRET || req.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
          res.status(401).json({ error: 'Unauthorized.' }); return;
        }
        void ProviderBudgetService.getInternalMetrics().then(result => res.json(result)).catch(error => {
          console.error('Provider metrics failure:', error);
          if (!res.headersSent) res.status(500).json({ error: 'Metrics unavailable.' });
        });
        return;
      }
      if (req.path.replace(/\/$/, '') === '/billing/webhook' && req.method === 'POST') {
        const signature = req.get('stripe-signature');
        if (!signature || !Buffer.isBuffer(req.body)) { res.status(400).json({ error: 'Invalid webhook.' }); return; }
        void LiveStripeService.webhook(req.body, signature).then(result => res.json(result)).catch(error => {
          console.error('Stripe webhook failure:', error);
          if (!res.headersSent) res.status(400).json({ error: 'Webhook rejected.' });
        });
        return;
      }
      if (req.path.replace(/\/$/, '') === '/integrations/x/callback') {
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
      return;
    }
    const localAddress = req.socket.remoteAddress;
    const isLoopback = localAddress === '127.0.0.1' || localAddress === '::1' || localAddress === '::ffff:127.0.0.1';
    if (isLoopback) return next();
    return res.status(403).json({ error: 'This API is available only in local development.' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // ==========================================
  // X (Twitter) OAuth 2.0 PKCE & Integration Routes
  // ==========================================

  // 1. Get OAuth Authorization URL
  app.get(['/api/integrations/x/auth-url', '/api/integrations/x/auth-url/'], authLimiter, (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const userId = (req.query.userId as string) || 'user_default';
    const authData = xSyncEngine.generateAuthorizationUrl(userId, origin);
    res.json(authData);
  });

  // 2. OAuth Callback Handler
  app.get(['/api/integrations/x/callback', '/api/integrations/x/callback/'], async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('X OAuth Callback Error received:', error, error_description);
      const errorMsg = String(error_description || error);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Recallly - Connection Error</title></head>
          <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #171717;">
            <script>
              var errorData = ${scriptJson({ type: 'X_AUTH_ERROR', error: errorMsg })};
              if (window.opener) {
                window.opener.postMessage(errorData, ${JSON.stringify(APP_ORIGIN)});
                window.close();
              } else {
                window.location.href = '/settings';
              }
            </script>
            <h3>Connection was cancelled or failed</h3>
            <p style="color: #70706B; font-size: 14px;">${escapeHtml(errorMsg)}</p>
            <p style="font-size: 13px; color: #8A8A85;">This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center;">
            <p>Missing required authorization parameters.</p>
          </body>
        </html>
      `);
    }

    const result = await xSyncEngine.handleOAuthCallback(String(code), String(state));

    if (!result.success) {
      const failMsg = String(result.error || 'Authorization exchange failed');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Recallly - Connection Failed</title></head>
          <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #171717;">
            <script>
              var errorData = ${scriptJson({ type: 'X_AUTH_ERROR', error: failMsg })};
              if (window.opener) {
                window.opener.postMessage(errorData, ${JSON.stringify(APP_ORIGIN)});
                window.close();
              } else {
                window.location.href = '/settings';
              }
            </script>
            <h3>Could not connect to X</h3>
            <p style="color: #EF4444; font-size: 14px;">${escapeHtml(failMsg)}</p>
            <p style="font-size: 13px; color: #8A8A85;">This window will close automatically.</p>
          </body>
        </html>
      `);
    }

    const user = result.user!;
    const successPayload = {
      type: 'X_AUTH_SUCCESS',
      data: {
        provider: 'twitter',
        username: user.username,
        displayName: user.name,
        avatarUrl: user.profile_image_url || '',
      },
    };

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Recallly - Connected</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #171717;">
          <script>
            try {
              var payload = ${scriptJson(successPayload)};
              if (window.opener) {
                window.opener.postMessage(payload, ${JSON.stringify(APP_ORIGIN)});
                setTimeout(function() { window.close(); }, 300);
              } else {
                window.location.href = '/settings';
              }
            } catch (e) {
              window.close();
            }
          </script>
          <div style="margin-bottom: 12px; font-size: 28px;">𝕏</div>
          <h3 style="margin: 0 0 8px 0;">Connected as @${escapeHtml(user.username)}</h3>
          <p style="color: #70706B; font-size: 13px; margin: 0 0 16px 0;">Authorized bookmark read access for Recallly.</p>
          <p style="color: #8A8A85; font-size: 12px;">This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // 3. Status of X connection
  app.get('/api/integrations/x/status', (req, res) => {
    const acc = store.getConnectedAccounts().find(a => a.provider === 'twitter');
    const origin = `${req.protocol}://${req.get('host')}`;
    const redirectUri = xSyncEngine.getRedirectUri(origin);
    const isConfigured = xSyncEngine.isConfigured();

    res.json({
      connected: Boolean(acc?.connected),
      username: acc?.username || '',
      displayName: acc?.displayName || '',
      avatarUrl: acc?.avatarUrl || '',
      last_sync_at: acc?.last_sync_at,
      last_successful_sync: acc?.last_successful_sync,
      sync_status: acc?.sync_status || 'idle',
      configured: isConfigured,
      redirectUri,
    });
  });

  // 4. Trigger Sync (Real bookmark fetch from X API v2)
  app.post(['/api/integrations/x/sync', '/api/sources/x/sync'], async (req, res) => {
    const userId = req.body?.userId || 'user_default';
    try {
      const result = await xSyncEngine.syncBookmarks(userId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Sync failed' });
    }
  });

  // 5. Get Sync Progress
  app.get(['/api/integrations/x/sync-status', '/api/sources/x/sync-status'], (req, res) => {
    res.json(xSyncEngine.getProgress());
  });

  // 6. Disconnect X Account
  app.post(['/api/integrations/x/disconnect', '/api/sources/x/disconnect'], (req, res) => {
    const userId = req.body?.userId || 'user_default';
    const ok = xSyncEngine.disconnect(userId);
    res.json({ success: ok });
  });

  // 7. Developer/Preview Test Connect
  app.post('/api/integrations/x/test-connect', authLimiter, (req, res) => {
    const { username, displayName } = req.body || {};
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username is required' });
    const acc = xSyncEngine.testConnectAccount(username, displayName || username);
    res.json({ success: true, account: acc });
  });

  // User Profile
  app.get('/api/user/profile', (req, res) => {
    res.json(store.getProfile());
  });

  app.patch('/api/user/profile', (req, res) => {
    const allowedFields = ['display_name', 'email', 'avatar_url', 'timezone', 'has_onboarded'];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = store.updateProfile(sanitized);
    res.json(updated);
  });

  // Connected accounts
  app.get('/api/connected-accounts', (req, res) => {
    res.json(store.getConnectedAccounts());
  });

  app.post('/api/sources/x/connect', (req, res) => {
    const { username, displayName } = req.body;
    if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username is required' });
    const updated = store.updateConnectedAccount('twitter', {
      connected: true,
      username,
      displayName: displayName || username,
      last_sync_at: new Date().toISOString(),
      last_successful_sync: new Date().toISOString(),
      sync_status: 'idle',
    });
    res.json(updated);
  });

  app.post('/api/sources/x/disconnect', (req, res) => {
    const updated = store.updateConnectedAccount('twitter', {
      connected: false,
      username: '',
      sync_status: 'idle',
    });
    res.json(updated);
  });

  app.post('/api/sources/x/sync', async (req, res) => {
    try {
      const added = await store.runSync(3);
      res.json({ success: true, addedCount: added.length, items: added });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sync failed' });
    }
  });

  app.get('/api/sources/x/sync-status', (req, res) => {
    res.json(store.getSyncProgress());
  });

  // Bookmarks
  app.get('/api/bookmarks', (req, res) => {
    const query = req.query.query as string | undefined;
    const topic = req.query.topic as string | undefined;
    const filter = req.query.filter as 'all' | 'unread' | 'favorites' | 'recent' | undefined;
    const sort = req.query.sort as 'newest' | 'oldest' | 'relevant' | undefined;

    const list = store.getBookmarks({ query, topic, filter, sort });
    res.json(list);
  });

  app.get('/api/bookmarks/rediscover', (req, res) => {
    const list = store.getRediscoverBookmarks(4);
    res.json(list);
  });

  app.get('/api/bookmarks/:id', (req, res) => {
    const b = store.getBookmarkById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Bookmark not found' });
    res.json(b);
  });

  app.get('/api/bookmarks/:id/related', (req, res) => {
    const related = store.getRelatedBookmarks(req.params.id, 3);
    res.json(related);
  });

  app.patch('/api/bookmarks/:id', (req, res) => {
    const allowedFields = ['is_favorite', 'is_read', 'notes', 'user_tags', 'title'];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = store.updateBookmark(req.params.id, sanitized);
    if (!updated) return res.status(404).json({ error: 'Bookmark not found' });
    res.json(updated);
  });

  // AI Bookmark Enrichment Pipeline Endpoints
  app.post('/api/bookmarks/:id/reprocess', aiLimiter, async (req, res) => {
    const ok = await enrichmentPipeline.reprocessItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Bookmark not found' });
    res.json({ success: true, message: 'Enrichment job enqueued' });
  });

  app.post('/api/bookmarks/reprocess-all', aiLimiter, (req, res) => {
    const count = enrichmentPipeline.reprocessAllPending();
    res.json({ success: true, count, message: `Enqueued ${count} bookmarks for re-enrichment` });
  });

  app.delete('/api/bookmarks/:id/topics/:topic', (req, res) => {
    const topic = decodeURIComponent(req.params.topic);
    const updated = store.removeTopicFromBookmark(req.params.id, topic);
    if (!updated) return res.status(404).json({ error: 'Bookmark not found' });
    res.json(updated);
  });

  app.get('/api/ai/enrichment-status', (req, res) => {
    res.json(enrichmentPipeline.getStatus());
  });

  app.get('/api/ai/usage', (req, res) => {
    const records = store.getAIUsage();
    const totalInputTokens = records.reduce((acc, r) => acc + (r.inputTokens || 0), 0);
    const totalOutputTokens = records.reduce((acc, r) => acc + (r.outputTokens || 0), 0);
    const totalCost = records.reduce((acc, r) => acc + (r.estimatedCost || 0), 0);

    res.json({
      summary: {
        totalOperations: records.length,
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCostUSD: Number(totalCost.toFixed(5)),
      },
      records: records.slice(0, 50),
    });
  });

  // Topics
  app.get('/api/topics', (req, res) => {
    res.json(store.getTopics());
  });

  app.post('/api/topics', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Topic name is required' });
    const topic = store.createTopic(name);
    res.json(topic);
  });

  // Collections
  app.get('/api/collections', (req, res) => {
    res.json(store.getCollections());
  });

  app.post('/api/collections', (req, res) => {
    const { name, description, visibility } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required' });
    const col = store.createCollection(name, description || '', visibility || 'private');
    res.json(col);
  });

  app.get('/api/collections/:slug', (req, res) => {
    const col = store.getCollectionBySlug(req.params.slug);
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    // Fetch associated bookmarks
    const bookmarks = col.bookmark_ids
      .map(id => store.getBookmarkById(id))
      .filter(Boolean);
    res.json({ ...col, bookmarks });
  });

  app.patch('/api/collections/:id', (req, res) => {
    const allowedFields = ['name', 'description', 'visibility', 'bookmark_ids'];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = store.updateCollection(req.params.id, sanitized);
    if (!updated) return res.status(404).json({ error: 'Collection not found' });
    res.json(updated);
  });

  app.delete('/api/collections/:id', (req, res) => {
    const ok = store.deleteCollection(req.params.id);
    res.json({ success: ok });
  });

  app.post('/api/collections/:id/toggle-bookmark', (req, res) => {
    const { bookmarkId } = req.body;
    if (!bookmarkId) return res.status(400).json({ error: 'bookmarkId required' });
    const col = store.toggleBookmarkInCollection(req.params.id, bookmarkId);
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    res.json(col);
  });

  // Digests
  app.get('/api/digests', (req, res) => {
    res.json(store.getDigests());
  });

  app.post('/api/digests/generate', aiLimiter, async (req, res) => {
    try {
      const digest = await store.generateNewDigest();
      res.json(digest);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to generate digest' });
    }
  });

  app.get('/api/digest/settings', (req, res) => {
    res.json(store.getDigestSettings());
  });

  app.put('/api/digest/settings', (req, res) => {
    const allowedFields = ['frequency', 'delivery_day', 'delivery_time', 'timezone', 'email', 'enabled'];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) sanitized[key] = req.body[key];
    }
    const updated = store.updateDigestSettings(sanitized);
    res.json(updated);
  });

  // Insights
  app.get('/api/insights', (req, res) => {
    res.json(store.getInsights());
  });

  // Chat RAG
  app.get('/api/chat/threads', (req, res) => {
    res.json(store.getChatThreads());
  });

  app.post('/api/chat/threads', (req, res) => {
    const thread = store.createChatThread(req.body?.title);
    res.json(thread);
  });

  app.post('/api/chat/threads/:id/messages', aiLimiter, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });
    try {
      const result = await store.askChat(req.params.id, message);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Chat error' });
    }
  });

  // Subscription / Billing
  app.get('/api/subscription', (req, res) => {
    res.json(store.getSubscription());
  });

  app.post('/api/subscription/upgrade', destructiveLimiter, (req, res) => {
    const sub = store.upgradeSubscription();
    res.json(sub);
  });

  // Global Search (Cmd+K)
  app.get('/api/search', (req, res) => {
    const q = req.query.q as string || '';
    res.json(store.globalSearch(q));
  });

  // Data & Privacy
  app.post('/api/data/export', destructiveLimiter, (req, res) => {
    const data = {
      profile: store.getProfile(),
      bookmarks: store.getBookmarks(),
      collections: store.getCollections(),
      digests: store.getDigests(),
      exportedAt: new Date().toISOString(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=kortex-bookmarks-export.json');
    res.send(JSON.stringify(data, null, 2));
  });

  app.post('/api/data/clear', destructiveLimiter, (req, res) => {
    store.resetAllData();
    res.json({ success: true, message: 'Library data reset to fresh state' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => {
    console.log(`Kortex server running at http://localhost:${PORT}`);
  });
}

startServer();
