import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { decryptToken, encryptToken } from '../crypto';
import { mapSavedItemRowToBookmark } from '../../src/lib/repositories/supabase/mappers';

const COOKIE = 'kortex_x_oauth_bind';
const CALLBACK_PATH = '/api/integrations/x/callback';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
class XBookmarkPaymentRequiredError extends Error {}

function config() {
  const appUrl = process.env.APP_URL;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.X_CLIENT_ID?.trim();
  const encryptionKey = process.env.ENCRYPTION_KEY || process.env.TOKEN_ENCRYPTION_SECRET;
  if (!appUrl || !supabaseUrl || !serviceKey || !clientId || !encryptionKey || encryptionKey.length < 32 ||
      !process.env.ENCRYPTION_SALT || process.env.ENCRYPTION_SALT.length < 16) return null;
  try {
    const origin = new URL(appUrl).origin;
    if (!origin.startsWith('https://') && !origin.startsWith('http://localhost:')) return null;
    return { origin, redirectUri: `${origin}${CALLBACK_PATH}`, clientId, serviceKey, supabaseUrl };
  } catch { return null; }
}

export const isLiveXConfigured = () => Boolean(config());

function tokenExpiry(seconds: unknown) {
  const duration = Number(seconds);
  const bounded = Number.isFinite(duration) ? Math.min(86400, Math.max(60, duration)) : 7200;
  return new Date(Date.now() + bounded * 1000).toISOString();
}

function admin() {
  const settings = config();
  if (!settings) throw new Error('Production X OAuth is not configured.');
  return createClient(settings.supabaseUrl, settings.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cookieValue(req: Request): string | null {
  const pair = (req.get('cookie') || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(`${COOKIE}=`));
  return pair ? pair.slice(COOKIE.length + 1) : null;
}

function cookieOptions(origin: string) {
  return { httpOnly: true, secure: origin.startsWith('https://'), sameSite: 'lax' as const,
    path: CALLBACK_PATH, maxAge: 10 * 60 * 1000 };
}

function jsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function callbackPage(res: Response, payload: Record<string, unknown>, origin: string, status = 200) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Helmet's default same-origin policy can sever the popup's opener after
  // navigation through x.com. The callback must be able to notify its opener.
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.status(status).type('html').send(`<!doctype html><html><head><meta name="referrer" content="no-referrer"><title>Kortex X connection</title></head><body><p>You may close this window.</p><script>
    history.replaceState(null, '', '/settings');
    const result = ${jsonForScript(payload)};
    if (window.opener) window.opener.postMessage(result, ${jsonForScript(origin)});
    else try { localStorage.setItem('kortex_x_oauth_result', JSON.stringify(result)); } catch {}
    window.close();
  </script></body></html>`);
}

export async function beginLiveXOAuth(req: Request, res: Response, userId: string) {
  const settings = config();
  if (!settings) {
    res.status(503).json({ url: null, state: '', configured: false, redirectUri: '', instructions: 'X connection is not configured.' });
    return;
  }
  const state = crypto.randomBytes(32).toString('base64url');
  const binding = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const db = admin();
  await db.from('x_oauth_states').delete().lt('expires_at', new Date().toISOString());
  const { error } = await db.from('x_oauth_states').insert({
    state_hash: hash(state), user_id: userId, browser_hash: hash(binding),
    code_verifier_encrypted: encryptToken(verifier), redirect_uri: settings.redirectUri,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  res.cookie(COOKIE, binding, cookieOptions(settings.origin));
  const params = new URLSearchParams({ response_type: 'code', client_id: settings.clientId,
    redirect_uri: settings.redirectUri, scope: 'tweet.read users.read bookmark.read offline.access',
    state, code_challenge: challenge, code_challenge_method: 'S256' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ url: `https://x.com/i/oauth2/authorize?${params}`, state, configured: true,
    redirectUri: settings.redirectUri });
}

export async function finishLiveXOAuth(req: Request, res: Response) {
  const settings = config();
  if (!settings) { res.status(503).send('X connection is not configured.'); return; }
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const binding = cookieValue(req);
  const invalid = () => callbackPage(res, { type: 'X_AUTH_ERROR', error: 'Authorization expired or could not be verified.' }, settings.origin, 400);
  if (!state || !binding) { invalid(); return; }

  // DELETE RETURNING makes the state one-use even across server instances.
  const { data: pending, error } = await admin().from('x_oauth_states').delete()
    .eq('state_hash', hash(state)).eq('browser_hash', hash(binding))
    .gt('expires_at', new Date().toISOString()).select().maybeSingle();
  res.clearCookie(COOKIE, { path: CALLBACK_PATH, secure: settings.origin.startsWith('https://'), sameSite: 'lax' });
  if (error || !pending || pending.redirect_uri !== settings.redirectUri) { invalid(); return; }
  if (req.query.error) {
    callbackPage(res, { type: 'X_AUTH_ERROR', error: 'X authorization was cancelled or denied.' }, settings.origin);
    return;
  }
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) { invalid(); return; }

  try {
    const verifier = decryptToken(pending.code_verifier_encrypted);
    const body = new URLSearchParams({ code, grant_type: 'authorization_code', client_id: settings.clientId,
      redirect_uri: pending.redirect_uri, code_verifier: verifier });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (process.env.X_CLIENT_SECRET) headers.Authorization = `Basic ${Buffer.from(`${settings.clientId}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`;
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body: body.toString() });
    if (!tokenResponse.ok) throw new Error('X token exchange failed.');
    const tokens = await tokenResponse.json();
    if (typeof tokens.access_token !== 'string') throw new Error('X did not return an access token.');
    const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=name,username,profile_image_url',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new Error('X profile lookup failed.');
    const profile = (await profileResponse.json()).data;
    if (!profile || typeof profile.id !== 'string' || typeof profile.username !== 'string') throw new Error('X profile was invalid.');
    const { error: saveError } = await admin().from('connected_accounts').upsert({
      user_id: pending.user_id, provider: 'twitter', provider_user_id: profile.id, username: profile.username,
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: typeof tokens.refresh_token === 'string' ? encryptToken(tokens.refresh_token) : null,
      token_expires_at: tokenExpiry(tokens.expires_in),
      sync_status: 'idle',
      metadata: { account_label: profile.name || profile.username, avatar_url: profile.profile_image_url || '' },
    }, { onConflict: 'user_id,provider' });
    if (saveError) throw saveError;
    callbackPage(res, { type: 'X_AUTH_SUCCESS', data: { provider: 'twitter', username: profile.username,
      displayName: profile.name || profile.username, avatarUrl: profile.profile_image_url || '' } }, settings.origin);
  } catch (error) {
    console.error('X OAuth callback failed:', error);
    callbackPage(res, { type: 'X_AUTH_ERROR', error: 'Could not connect to X. Please try again.' }, settings.origin, 502);
  }
}

export async function disconnectLiveX(userId: string) {
  const { error } = await admin().from('connected_accounts').delete().eq('user_id', userId).eq('provider', 'twitter');
  if (error) throw error;
  return { success: true };
}

export async function syncLiveX(userId: string) {
  const db = admin();
  const { data: account, error } = await db.from('connected_accounts').select('*')
    .eq('user_id', userId).eq('provider', 'twitter').maybeSingle();
  if (error) throw error;
  if (!account || !account.access_token_encrypted || !account.provider_user_id) {
    return { success: false, addedCount: 0, discoveredCount: 0, items: [], statusCode: 409, error: 'X account is not connected.' };
  }
  let accessToken = decryptToken(account.access_token_encrypted);
  if (account.token_expires_at && new Date(account.token_expires_at).getTime() < Date.now() + 120000) {
    if (!account.refresh_token_encrypted) return { success: false, addedCount: 0, discoveredCount: 0, items: [], statusCode: 409, error: 'Reconnect X to continue syncing.' };
    const settings = config()!;
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decryptToken(account.refresh_token_encrypted), client_id: settings.clientId });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (process.env.X_CLIENT_SECRET) headers.Authorization = `Basic ${Buffer.from(`${settings.clientId}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`;
    const response = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body: body.toString() });
    if (!response.ok) {
      await db.from('connected_accounts').update({ sync_status: 'error' }).eq('id', account.id);
      return { success: false, addedCount: 0, discoveredCount: 0, items: [], statusCode: 409, error: 'Reconnect X to continue syncing.' };
    }
    const tokens = await response.json();
    if (typeof tokens.access_token !== 'string') throw new Error('X refresh did not return an access token.');
    accessToken = tokens.access_token;
    const { error: updateError } = await db.from('connected_accounts').update({
      access_token_encrypted: encryptToken(accessToken),
      refresh_token_encrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : account.refresh_token_encrypted,
      token_expires_at: tokenExpiry(tokens.expires_in),
    }).eq('id', account.id);
    if (updateError) throw updateError;
  }

  // Compare-and-set on a server-written timestamp limits provider calls even
  // when two app instances receive sync requests at the same time.
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: lock, error: lockError } = await db.from('connected_accounts')
    .update({ sync_status: 'syncing', last_sync_at: new Date().toISOString() })
    .eq('id', account.id).eq('user_id', userId)
    .or(`last_sync_at.is.null,last_sync_at.lt.${cutoff}`).select('id').maybeSingle();
  if (lockError) throw lockError;
  if (!lock) return { success: false, addedCount: 0, discoveredCount: 0, items: [], statusCode: 429, error: 'Please wait a minute before syncing again.' };

  const { data: job, error: jobError } = await db.from('sync_jobs').insert({ user_id: userId, provider: 'twitter',
    connected_account_id: account.id, status: 'running', started_at: new Date().toISOString() }).select().single();
  if (jobError) {
    await db.from('connected_accounts').update({ sync_status: 'error' }).eq('id', account.id);
    throw jobError;
  }
  try {
    const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(account.provider_user_id)}/bookmarks`);
    url.searchParams.set('max_results', '100');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('tweet.fields', 'created_at,note_tweet');
    url.searchParams.set('user.fields', 'name,username,profile_image_url');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.status === 402) {
      throw new XBookmarkPaymentRequiredError('X API returned 402 Payment Required. Check your X Developer Console credit balance and spending limit before retrying.');
    }
    if (!response.ok) throw new Error(`X bookmarks request failed (${response.status}).`);
    const payload = await response.json();
    const tweets: Array<{ id: string; text: string; author_id?: string; created_at?: string; note_tweet?: { text?: string } }> = payload.data || [];
    const authors = new Map((payload.includes?.users || []).map((author: any) => [author.id, author]));
    const rows = tweets.filter(tweet => typeof tweet.id === 'string' && typeof tweet.text === 'string').map(tweet => {
      const author: any = authors.get(tweet.author_id);
      return { user_id: userId, source: 'twitter', external_id: tweet.id, content: tweet.note_tweet?.text || tweet.text,
        url: `https://x.com/${author?.username || 'i'}/status/${tweet.id}`, author_id: tweet.author_id || null,
        author_name: author?.name || '', author_username: author?.username || '', author_avatar_url: author?.profile_image_url || null,
        published_at: tweet.created_at || null, saved_at: new Date().toISOString(), metadata: {} };
    });
    const { data: existing, error: existingError } = rows.length
      ? await db.from('saved_items').select('external_id').eq('user_id', userId).eq('source', 'twitter')
        .in('external_id', rows.map(row => row.external_id))
      : { data: [], error: null };
    if (existingError) throw existingError;
    const seen = new Set((existing || []).map(item => item.external_id));
    const newRows = rows.filter(row => {
      if (seen.has(row.external_id)) return false;
      seen.add(row.external_id);
      return true;
    });
    const { data: saved, error: saveError } = newRows.length
      ? await db.from('saved_items').insert(newRows).select()
      : { data: [], error: null };
    if (saveError) throw saveError;
    const now = new Date().toISOString();
    await Promise.all([
      db.from('sync_jobs').update({ status: 'completed', items_discovered: tweets.length, items_processed: saved?.length || 0, completed_at: now }).eq('id', job.id),
      db.from('connected_accounts').update({ sync_status: 'idle', last_sync_at: now, last_successful_sync_at: now }).eq('id', account.id),
    ]);
    return { success: true, addedCount: saved?.length || 0, discoveredCount: tweets.length,
      items: (saved || []).map(row => mapSavedItemRowToBookmark(row)) };
  } catch (syncError) {
    const paymentRequired = syncError instanceof XBookmarkPaymentRequiredError;
    await Promise.all([
      db.from('sync_jobs').update({ status: 'failed', error_message: paymentRequired ? 'X API returned HTTP 402 Payment Required.' : 'X sync failed.', completed_at: new Date().toISOString() }).eq('id', job.id),
      db.from('connected_accounts').update({ sync_status: 'error' }).eq('id', account.id),
    ]);
    if (paymentRequired) return { success: false, addedCount: 0, discoveredCount: 0, items: [], statusCode: 402, error: (syncError as Error).message };
    throw syncError;
  }
}
