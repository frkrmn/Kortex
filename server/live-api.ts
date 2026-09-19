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
    if (route === '/topics' && method === 'POST') {
      const name = req.body?.name;
      if (typeof name !== 'string' || !name.trim() || name.length > 120) { res.status(400).json({ error: 'Valid topic name required.' }); return; }
      const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!slug) { res.status(400).json({ error: 'Valid topic name required.' }); return; }
      const { data, error } = await db.from('topics').upsert({ user_id: user.id, name: name.trim(), slug }, { onConflict: 'user_id,slug' }).select().single();
      if (error) throw error;
      res.json(mapTopicRowToTopic(data));
      return;
    }
    if (route === '/digests' && method === 'GET') {
      const { data, error } = await db.from('digests').select('*').eq('user_id', user.id).order('period_start', { ascending: false });
      if (error) throw error;
      res.json(data.map(row => mapDigestRowToDigest(row)));
      return;
    }
    const digestId = route.match(/^\/digests\/([^/]+)$/)?.[1];
    if (digestId && method === 'GET') {
      const { data, error } = await db.from('digests').select('*').eq('id', digestId).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ error: 'Digest not found.' }); return; }
      res.json(mapDigestRowToDigest(data));
      return;
    }
    if (route === '/digest/settings' && method === 'GET') {
      const { data, error } = await db.from('digest_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) { res.status(404).json({ error: 'Digest settings not found.' }); return; }
      res.json(mapDigestSettingsRowToSettings(data));
      return;
    }
    if (route === '/digest/settings' && method === 'PUT') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const updates: Record<string, unknown> = {};
      if (['daily', 'weekly', 'monthly', 'off'].includes(req.body?.frequency)) updates.frequency = req.body.frequency;
      if (days.includes(req.body?.delivery_day)) updates.delivery_day = days.indexOf(req.body.delivery_day);
      if (typeof req.body?.delivery_time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(req.body.delivery_time)) updates.delivery_time = req.body.delivery_time;
      if (typeof req.body?.timezone === 'string' && req.body.timezone.length <= 100) updates.timezone = req.body.timezone;
      if (typeof req.body?.enabled === 'boolean') updates.enabled = req.body.enabled;
      if (!Object.keys(updates).length) { res.status(400).json({ error: 'No valid settings supplied.' }); return; }
      const { data, error } = await db.from('digest_settings').upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      res.json(mapDigestSettingsRowToSettings(data));
      return;
    }
    if (route === '/subscription' && method === 'GET') {
      const { data, error } = await db.from('subscriptions').select('user_id, provider, plan, status, current_period_start, current_period_end, cancel_at_period_end').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      res.json(data || { user_id: user.id, plan: 'free', status: 'active' });
      return;
    }

    if (route === '/chat/threads' && method === 'GET') {
      const { data: threads, error } = await db.from('chat_threads').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      if (error) throw error;
      const { data: messages, error: messagesError } = await db.from('chat_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (messagesError) throw messagesError;
      res.json(threads.map(thread => ({ ...thread, messages: (messages || []).filter(message => message.thread_id === thread.id) })));
      return;
    }
    if (route === '/chat/threads' && method === 'POST') {
      const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim().slice(0, 120) : 'New Conversation';
      const { data, error } = await db.from('chat_threads').insert({ user_id: user.id, title }).select().single();
      if (error) throw error;
      res.json({ ...data, messages: [] });
      return;
    }
    const threadId = route.match(/^\/chat\/threads\/([^/]+)$/)?.[1];
    if (threadId && (method === 'GET' || method === 'DELETE')) {
      const { data: thread, error } = await db.from('chat_threads').select('*').eq('id', threadId).eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (!thread) { res.status(404).json({ error: 'Thread not found.' }); return; }
      if (method === 'DELETE') {
        const { error: deleteError } = await db.from('chat_threads').delete().eq('id', threadId).eq('user_id', user.id);
        if (deleteError) throw deleteError;
        res.json({ success: true });
        return;
      }
      const { data: messages, error: messagesError } = await db.from('chat_messages').select('*')
        .eq('thread_id', threadId).eq('user_id', user.id).order('created_at', { ascending: true });
      if (messagesError) throw messagesError;
      res.json({ ...thread, messages: messages || [] });
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
    if (route === '/bookmarks/rediscover' && method === 'GET') {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db.from('saved_items').select('*').eq('user_id', user.id)
        .lt('saved_at', cutoff).order('saved_at', { ascending: false }).limit(4);
      if (error) throw error;
      res.json(data.map(row => mapSavedItemRowToBookmark(row)));
      return;
    }
    const bookmarkId = route.match(/^\/bookmarks\/([^/]+)$/)?.[1];
    const relatedId = route.match(/^\/bookmarks\/([^/]+)\/related$/)?.[1];
    if (relatedId && method === 'GET') {
      const { data: source, error: sourceError } = await db.from('saved_items').select('*')
        .eq('id', relatedId).eq('user_id', user.id).maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) { res.status(404).json({ error: 'Bookmark not found.' }); return; }
      const { data, error } = await db.from('saved_items').select('*').eq('user_id', user.id)
        .neq('id', relatedId).order('saved_at', { ascending: false }).limit(100);
      if (error) throw error;
      const sourceTopics = new Set(mapSavedItemRowToBookmark(source).topics);
      const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 3));
      res.json(data.map(row => mapSavedItemRowToBookmark(row))
        .map(bookmark => ({ bookmark, similarity: bookmark.topics.filter(topic => sourceTopics.has(topic)).length }))
        .filter(item => item.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, limit));
      return;
    }
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
      const { data: links, error: linksError } = await db.from('collection_items').select('collection_id, saved_item_id');
      if (linksError) throw linksError;
      res.json(data.map(row => mapCollectionRowToCollection(row,
        (links || []).filter(link => link.collection_id === row.id).map(link => link.saved_item_id))));
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
    if (collectionSlug && (method === 'PATCH' || method === 'DELETE')) {
      const { data: owned, error: ownerError } = await db.from('collections').select('*').eq('id', collectionSlug).eq('user_id', user.id).maybeSingle();
      if (ownerError) throw ownerError;
      if (!owned) { res.status(404).json({ error: 'Collection not found.' }); return; }
      if (method === 'DELETE') {
        const { error } = await db.from('collections').delete().eq('id', owned.id).eq('user_id', user.id);
        if (error) throw error;
        res.json({ success: true });
        return;
      }
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
      if (typeof req.body?.description === 'string') updates.description = req.body.description;
      if (req.body?.visibility === 'public' || req.body?.visibility === 'private') updates.visibility = req.body.visibility;
      if (!Object.keys(updates).length) { res.status(400).json({ error: 'No valid updates supplied.' }); return; }
      const { data, error } = await db.from('collections').update(updates).eq('id', owned.id).eq('user_id', user.id).select().single();
      if (error) throw error;
      const { data: links, error: linksError } = await db.from('collection_items').select('saved_item_id').eq('collection_id', owned.id);
      if (linksError) throw linksError;
      res.json(mapCollectionRowToCollection(data, (links || []).map(link => link.saved_item_id)));
      return;
    }
    const toggleCollectionId = route.match(/^\/collections\/([^/]+)\/toggle-bookmark$/)?.[1];
    if (toggleCollectionId && method === 'POST') {
      const bookmarkId = req.body?.bookmarkId;
      if (typeof bookmarkId !== 'string') { res.status(400).json({ error: 'Bookmark ID required.' }); return; }
      const [collectionResult, bookmarkResult] = await Promise.all([
        db.from('collections').select('*').eq('id', toggleCollectionId).eq('user_id', user.id).maybeSingle(),
        db.from('saved_items').select('id').eq('id', bookmarkId).eq('user_id', user.id).maybeSingle(),
      ]);
      if (collectionResult.error || bookmarkResult.error) throw collectionResult.error || bookmarkResult.error;
      if (!collectionResult.data || !bookmarkResult.data) { res.status(404).json({ error: 'Collection or bookmark not found.' }); return; }
      const { data: existing, error: existingError } = await db.from('collection_items').select('saved_item_id')
        .eq('collection_id', toggleCollectionId).eq('saved_item_id', bookmarkId).maybeSingle();
      if (existingError) throw existingError;
      const changed = existing
        ? await db.from('collection_items').delete().eq('collection_id', toggleCollectionId).eq('saved_item_id', bookmarkId)
        : await db.from('collection_items').insert({ collection_id: toggleCollectionId, saved_item_id: bookmarkId });
      if (changed.error) throw changed.error;
      const { data: links, error: linksError } = await db.from('collection_items').select('saved_item_id').eq('collection_id', toggleCollectionId);
      if (linksError) throw linksError;
      res.json(mapCollectionRowToCollection(collectionResult.data, (links || []).map(link => link.saved_item_id)));
      return;
    }
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

    if (route === '/data/clear' && method === 'POST') {
      const { error } = await db.rpc('clear_my_library');
      if (error) throw error;
      res.json({ success: true, message: 'Library data cleared.' });
      return;
    }

    res.status(501).json({ error: 'This route has not been migrated to tenant scoped storage.' });
  } catch (error) {
    console.error('Live API error:', error);
    res.status(500).json({ error: 'Request failed.' });
  }
}
