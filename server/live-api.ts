import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mapSavedItemRowToBookmark, mapCollectionRowToCollection, mapProfileRowToProfile, mapConnectedAccountSafeToAccount, mapDigestRowToDigest, mapDigestSettingsRowToSettings, mapTopicRowToTopic } from '../src/lib/repositories/supabase/mappers';

/** Production routes use the caller's JWT and Postgres RLS, never the demo file. */
export async function liveApi(req: Request, res: Response): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || process.env.VITE_DEMO_MODE !== 'false') {
    res.status(503).json({ error: 'Production Supabase configuration is required.' });
    return;
  }

  const bearer = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!bearer || bearer === 'demo_token') {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await db.auth.getUser(bearer).catch(() => ({ data: { user: null }, error: true }));
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid session.' });
    return;
  }

  const route = req.path.replace(/\/$/, '');
  const method = req.method;
  try {
    if (route === '/user/profile' && method === 'GET') {
      const { data, error } = await db.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      res.json(mapProfileRowToProfile(data, user.email));
      return;
    }
    if (route === '/user/profile' && method === 'PATCH') {
      const updates = Object.fromEntries(['display_name', 'avatar_url', 'timezone'].filter(k =>
        typeof req.body?.[k] === 'string'
      ).map(k => [k, req.body[k]]));
      const { data, error } = await db.from('profiles').update(updates).eq('user_id', user.id).select().single();
      if (error) throw error;
      res.json(mapProfileRowToProfile(data, user.email));
      return;
    }

    if (route === '/connected-accounts' && method === 'GET') {
      const { data, error } = await db.from('connected_accounts_safe').select('*').eq('user_id', user.id);
      if (error) throw error;
      res.json(data.map(row => mapConnectedAccountSafeToAccount(row)));
      return;
    }
    if (route === '/topics' && method === 'GET') {
      const { data, error } = await db.from('topics').select('*').eq('user_id', user.id);
      if (error) throw error;
      res.json(data.map(row => mapTopicRowToTopic(row)));
      return;
    }
    if (route === '/digests' && method === 'GET') {
      const { data, error } = await db.from('digests').select('*').eq('user_id', user.id).order('period_start', { ascending: false });
      if (error) throw error;
      res.json(data.map(row => mapDigestRowToDigest(row)));
      return;
    }
    if (route === '/digest/settings' && method === 'GET') {
      const { data, error } = await db.from('digest_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ error: 'Digest settings not found.' }); return; }
      res.json(mapDigestSettingsRowToSettings(data));
      return;
    }
    if (route === '/subscription' && method === 'GET') {
      const { data, error } = await db.from('subscriptions').select('user_id, provider, plan, status, current_period_start, current_period_end, cancel_at_period_end').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      res.json(data || { user_id: user.id, plan: 'free', status: 'active' });
      return;
    }

    if (route === '/bookmarks' && method === 'GET') {
      let query = db.from('saved_items').select('*').eq('user_id', user.id).order('saved_at', { ascending: false });
      if (req.query.filter === 'unread') query = query.eq('is_read', false);
      if (req.query.filter === 'favorites') query = query.eq('is_favorite', true);
      const { data, error } = await query;
      if (error) throw error;
      let items = data.map(row => mapSavedItemRowToBookmark(row));
      if (typeof req.query.query === 'string' && req.query.query.trim()) {
        const term = req.query.query.toLowerCase().trim();
        items = items.filter(item => `${item.content} ${item.author_name} ${item.ai_summary}`.toLowerCase().includes(term));
      }
      if (typeof req.query.topic === 'string' && req.query.topic !== 'all') {
        items = items.filter(item => item.topics.includes(req.query.topic as string));
      }
      if (req.query.sort === 'oldest') items.reverse();
      res.json(items);
      return;
    }
    const bookmarkId = route.match(/^\/bookmarks\/([^/]+)$/)?.[1];
    if (bookmarkId && method === 'GET') {
      const { data, error } = await db.from('saved_items').select('*').eq('id', bookmarkId).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ error: 'Bookmark not found.' }); return; }
      res.json(mapSavedItemRowToBookmark(data));
      return;
    }
    if (bookmarkId && method === 'PATCH') {
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.is_read === 'boolean') updates.is_read = req.body.is_read;
      if (typeof req.body?.is_favorite === 'boolean') updates.is_favorite = req.body.is_favorite;
      const { data, error } = await db.from('saved_items').update(updates).eq('id', bookmarkId).eq('user_id', user.id).select().maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ error: 'Bookmark not found.' }); return; }
      res.json(mapSavedItemRowToBookmark(data));
      return;
    }

    if (route === '/collections' && method === 'GET') {
      const { data, error } = await db.from('collections').select('*').eq('user_id', user.id);
      if (error) throw error;
      res.json(data.map(row => mapCollectionRowToCollection(row)));
      return;
    }
    if (route === '/collections' && method === 'POST') {
      const name = req.body?.name;
      if (typeof name !== 'string' || !name.trim()) { res.status(400).json({ error: 'Name required.' }); return; }
      const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
      const { data, error } = await db.from('collections').insert({
        user_id: user.id, name: name.trim(), description: typeof req.body?.description === 'string' ? req.body.description : '',
        visibility, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomUUID().slice(0, 8)}`,
      }).select().single();
      if (error) throw error;
      res.json(mapCollectionRowToCollection(data));
      return;
    }
    const collectionSlug = route.match(/^\/collections\/([^/]+)$/)?.[1];
    if (collectionSlug && method === 'GET') {
      const { data: col, error } = await db.from('collections').select('*').eq('slug', collectionSlug).maybeSingle();
      if (error) throw error;
      if (!col) { res.status(404).json({ error: 'Collection not found.' }); return; }
      const { data: links, error: linksError } = await db.from('collection_items').select('saved_item_id').eq('collection_id', col.id);
      if (linksError) throw linksError;
      const ids = (links || []).map(link => link.saved_item_id);
      const { data: rows, error: itemsError } = ids.length
        ? await db.from('saved_items').select('*').in('id', ids)
        : { data: [], error: null };
      if (itemsError) throw itemsError;
      res.json({ ...mapCollectionRowToCollection(col, ids), bookmarks: (rows || []).map(row => mapSavedItemRowToBookmark(row)) });
      return;
    }

    if (route === '/search' && method === 'GET') {
      const term = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
      if (!term) { res.json({ bookmarks: [], collections: [], topics: [] }); return; }
      const [bookmarksResult, collectionsResult, topicsResult] = await Promise.all([
        db.from('saved_items').select('*').eq('user_id', user.id),
        db.from('collections').select('*').eq('user_id', user.id),
        db.from('topics').select('*').eq('user_id', user.id),
      ]);
      if (bookmarksResult.error || collectionsResult.error || topicsResult.error) {
        throw bookmarksResult.error || collectionsResult.error || topicsResult.error;
      }
      res.json({
        bookmarks: (bookmarksResult.data || []).map(row => mapSavedItemRowToBookmark(row))
          .filter(item => `${item.content} ${item.author_name} ${item.ai_summary}`.toLowerCase().includes(term)).slice(0, 5),
        collections: (collectionsResult.data || []).map(row => mapCollectionRowToCollection(row))
          .filter(item => `${item.name} ${item.description}`.toLowerCase().includes(term)).slice(0, 3),
        topics: (topicsResult.data || []).map(row => mapTopicRowToTopic(row))
          .filter(item => item.name.toLowerCase().includes(term)).slice(0, 4),
      });
      return;
    }

    if (route === '/data/export' && method === 'POST') {
      const [profile, bookmarks, collections, digests] = await Promise.all([
        db.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        db.from('saved_items').select('*').eq('user_id', user.id),
        db.from('collections').select('*').eq('user_id', user.id),
        db.from('digests').select('*').eq('user_id', user.id),
      ]);
      if (profile.error || bookmarks.error || collections.error || digests.error) {
        throw profile.error || bookmarks.error || collections.error || digests.error;
      }
      res.setHeader('Content-Disposition', 'attachment; filename=kortex-data-export.json');
      res.json({
        profile: profile.data ? mapProfileRowToProfile(profile.data, user.email) : null,
        bookmarks: (bookmarks.data || []).map(row => mapSavedItemRowToBookmark(row)),
        collections: (collections.data || []).map(row => mapCollectionRowToCollection(row)),
        digests: (digests.data || []).map(row => mapDigestRowToDigest(row)),
        exportedAt: new Date().toISOString(),
      });
      return;
    }

    res.status(501).json({ error: 'This route has not been migrated to tenant scoped storage.' });
  } catch (error) {
    console.error('Live API error:', error);
    res.status(500).json({ error: 'Request failed.' });
  }
}
