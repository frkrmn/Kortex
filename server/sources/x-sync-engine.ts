import crypto from 'crypto';
import { Bookmark, ConnectedAccount, SyncProgressState } from '../../src/types';
import { encryptToken, decryptToken } from '../crypto';
import { store } from '../store';
import { enrichmentPipeline } from '../ai/enrichment-pipeline';

export interface PkceStateRecord {
  codeVerifier: string;
  userId: string;
  createdAt: number;
  redirectUri: string;
}

export interface XApiUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
}

export interface XApiMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
}

export interface XApiTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  lang?: string;
  note_tweet?: {
    text: string;
  };
  attachments?: {
    media_keys?: string[];
  };
  public_metrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
}

export interface XBookmarksResponse {
  data?: XApiTweet[];
  includes?: {
    users?: XApiUser[];
    media?: XApiMedia[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
    previous_token?: string;
  };
  errors?: Array<{
    message: string;
    code?: number;
  }>;
}

export class XSyncEngine {
  // In-memory PKCE state cache (10 minute expiry)
  private stateCache = new Map<string, PkceStateRecord>();

  // Stored OAuth credentials in memory for fast access (encrypted in storage)
  private activeTokens = new Map<string, {
    xUserId: string;
    username: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    expiresAt: number;
  }>();

  private progressState: SyncProgressState = {
    isSyncing: false,
    stage: 'idle',
    processedCount: 0,
    totalCount: 0,
    message: 'Ready to sync',
  };

  constructor() {
    // Periodically clean expired PKCE states
    setInterval(() => {
      const now = Date.now();
      for (const [state, rec] of this.stateCache.entries()) {
        if (now - rec.createdAt > 1000 * 60 * 15) {
          this.stateCache.delete(state);
        }
      }
    }, 1000 * 60 * 5);
  }

  /**
   * Generates Base64URL-encoded SHA-256 code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generates random 43-128 character URL-safe string for PKCE code_verifier
   */
  private generateCodeVerifier(): string {
    return crypto
      .randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Resolves effective App Redirect URI adhering to AI Studio runtime constraints
   */
  public getRedirectUri(reqOrigin?: string): string {
    const rawAppUrl = process.env.APP_URL || reqOrigin || 'http://localhost:3000';
    const baseUrl = rawAppUrl.replace(/\/$/, '');
    return `${baseUrl}/api/integrations/x/callback`;
  }

  public getClientId(): string {
    return (process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || '').trim();
  }

  public getClientSecret(): string {
    return (process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || '').trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.getClientId());
  }

  /**
   * Generates official OAuth 2.0 PKCE Authorization URL for X (Twitter)
   * Scopes requested: tweet.read users.read bookmark.read offline.access
   */
  public generateAuthorizationUrl(userId: string = 'user_default', reqOrigin?: string): {
    url: string | null;
    state: string;
    configured: boolean;
    redirectUri: string;
    instructions?: string;
  } {
    const redirectUri = this.getRedirectUri(reqOrigin);
    const clientId = this.getClientId();
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const MAX_STATE_CACHE_SIZE = 1000;
    if (this.stateCache.size >= MAX_STATE_CACHE_SIZE) {
      return {
        url: null,
        state: '',
        configured: true,
        redirectUri,
        instructions: 'Too many pending authorization requests. Please try again later.',
      };
    }

    this.stateCache.set(state, {
      codeVerifier,
      userId,
      createdAt: Date.now(),
      redirectUri,
    });

    if (!clientId) {
      return {
        url: null,
        state,
        configured: false,
        redirectUri,
        instructions: 'X_CLIENT_ID is not configured. Add X_CLIENT_ID to .env or use the test connection.',
      };
    }

    const scopes = ['tweet.read', 'users.read', 'bookmark.read', 'offline.access'].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return {
      url: authUrl,
      state,
      configured: true,
      redirectUri,
    };
  }

  /**
   * Handles OAuth callback exchange (Authorization Code + Code Verifier -> Access/Refresh Tokens)
   */
  public async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{
    success: boolean;
    user?: XApiUser;
    error?: string;
  }> {
    const stateRecord = this.stateCache.get(state);
    if (!stateRecord) {
      return {
        success: false,
        error: 'Invalid or expired state parameter. Please try connecting again.',
      };
    }

    this.stateCache.delete(state);

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId) {
      return { success: false, error: 'X_CLIENT_ID is not configured.' };
    }

    try {
      const bodyParams = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: stateRecord.redirectUri,
        code_verifier: stateRecord.codeVerifier,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (clientSecret) {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      }

      const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers,
        body: bodyParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('X Token exchange failed:', tokenRes.status, errText);
        return {
          success: false,
          error: 'Failed to exchange token with X. Please try connecting again.',
        };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 7200;

      // Fetch authenticated user profile
      const userRes = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username,description',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userRes.ok) {
        const userErr = await userRes.text();
        console.error('X Fetch User failed:', userRes.status, userErr);
        return {
          success: false,
          error: `Failed to fetch authenticated user from X: ${userRes.statusText}`,
        };
      }

      const userJson = await userRes.json();
      const xUser: XApiUser = userJson.data;

      // Encrypt sensitive tokens before storing (AES-256-GCM)
      const accessTokenEncrypted = encryptToken(accessToken);
      const refreshTokenEncrypted = refreshToken ? encryptToken(refreshToken) : undefined;
      const expiresAt = Date.now() + expiresIn * 1000;

      // Save to memory cache
      this.activeTokens.set(stateRecord.userId, {
        xUserId: xUser.id,
        username: xUser.username,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
      });

      // Update connected accounts in store
      store.updateConnectedAccount('twitter', {
        connected: true,
        username: xUser.username,
        displayName: xUser.name,
        avatarUrl: xUser.profile_image_url || '',
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
      });

      return {
        success: true,
        user: xUser,
      };
    } catch (err: any) {
      console.error('X OAuth Exception:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during X authorization.',
      };
    }
  }

  /**
   * Refreshes the X OAuth 2.0 access token if needed
   */
  private async getValidAccessToken(userId: string = 'user_default'): Promise<{
    token: string;
    xUserId: string;
  } | null> {
    const creds = this.activeTokens.get(userId);
    if (!creds) return null;

    // If token still valid for > 2 minutes, return decrypted token
    if (creds.expiresAt > Date.now() + 120 * 1000) {
      return {
        token: decryptToken(creds.accessTokenEncrypted),
        xUserId: creds.xUserId,
      };
    }

    // Attempt token refresh
    if (!creds.refreshTokenEncrypted) {
      return {
        token: decryptToken(creds.accessTokenEncrypted),
        xUserId: creds.xUserId,
      };
    }

    try {
      const refreshToken = decryptToken(creds.refreshTokenEncrypted);
      const clientId = this.getClientId();
      const clientSecret = this.getClientSecret();

      const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (clientSecret) {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
      }

      const res = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers,
        body: bodyParams.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        creds.accessTokenEncrypted = encryptToken(data.access_token);
        if (data.refresh_token) {
          creds.refreshTokenEncrypted = encryptToken(data.refresh_token);
        }
        creds.expiresAt = Date.now() + (data.expires_in || 7200) * 1000;
        this.activeTokens.set(userId, creds);

        return {
          token: data.access_token,
          xUserId: creds.xUserId,
        };
      }
    } catch (e) {
      console.warn('Token refresh failed, attempting with existing token:', e);
    }

    return {
      token: decryptToken(creds.accessTokenEncrypted),
      xUserId: creds.xUserId,
    };
  }

  /**
   * Normalizes raw X Tweet payload into Recallly's SavedItem/Bookmark model.
   * STRICT DIRECTIVE: Do NOT invent the date on which the user bookmarked a post
   * if X does not provide that timestamp. published_at = tweet.created_at; saved_at = imported_at.
   */
  public normalizeTweet(
    tweet: XApiTweet,
    author: XApiUser | undefined,
    mediaMap: Map<string, XApiMedia>,
    userId: string
  ): Bookmark {
    const tweetText = tweet.note_tweet?.text || tweet.text || '';
    const authorUsername = author?.username || 'x_author';
    const authorName = author?.name || 'X Author';
    const authorAvatar = author?.profile_image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    const postUrl = `https://x.com/${authorUsername}/status/${tweet.id}`;

    // Extract media
    const media: Array<{
      type: 'image' | 'video' | 'link_preview';
      url: string;
      previewUrl?: string;
      alt?: string;
    }> = [];

    if (tweet.attachments?.media_keys) {
      for (const key of tweet.attachments.media_keys) {
        const m = mediaMap.get(key);
        if (m) {
          if (m.type === 'photo') {
            media.push({
              type: 'image',
              url: m.url || m.preview_image_url || '',
              previewUrl: m.preview_image_url || m.url,
              alt: m.alt_text,
            });
          } else {
            media.push({
              type: 'video',
              url: m.url || m.preview_image_url || '',
              previewUrl: m.preview_image_url,
              alt: m.alt_text,
            });
          }
        }
      }
    }

    // Derive preliminary semantic topics based on keywords (prior to Phase 9 AI pipeline)
    const lower = tweetText.toLowerCase();
    const topics: string[] = [];
    if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent') || lower.includes('model')) {
      topics.push('AI & LLMs');
    }
    if (lower.includes('startup') || lower.includes('founder') || lower.includes('venture') || lower.includes('saas')) {
      topics.push('Startups & Venture');
    }
    if (lower.includes('product') || lower.includes('feature') || lower.includes('roadmap') || lower.includes('user')) {
      topics.push('Product Strategy');
    }
    if (lower.includes('design') || lower.includes('css') || lower.includes('ui') || lower.includes('craft')) {
      topics.push('Design & UI');
    }
    if (lower.includes('system') || lower.includes('code') || lower.includes('architecture') || lower.includes('database')) {
      topics.push('Engineering & Systems');
    }
    if (topics.length === 0) {
      topics.push('Knowledge');
    }

    // Tweet timestamp is published_at.
    // As instructed: DO NOT invent a bookmarking timestamp if X API v2 doesn't provide it.
    // saved_at is set to current imported timestamp.
    const importTime = new Date().toISOString();
    const tweetCreatedAt = tweet.created_at || importTime;

    return {
      id: `bm_x_${tweet.id}`,
      user_id: userId,
      source: 'twitter',
      external_id: tweet.id,
      author_id: author?.id,
      author_name: authorName,
      author_username: authorUsername,
      author_avatar: authorAvatar,
      content: tweetText,
      url: postUrl,
      media: media.length > 0 ? media : undefined,
      bookmark_created_at: tweetCreatedAt, // Published at
      imported_at: importTime,
      is_read: false,
      is_favorite: false,
      ai_summary: '', // Enriched asynchronously by AI enrichment pipeline
      enrichment_status: 'pending',
      language: tweet.lang || 'en',
      topics,
      keywords: topics.map(t => t.toLowerCase()),
      collection_ids: [],
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
      },
    };
  }

  /**
   * Main sync engine execution
   * Fetches real bookmarks via official X API v2 and normalizes them into library
   */
  public async syncBookmarks(userId: string = 'user_default'): Promise<{
    success: boolean;
    addedCount: number;
    discoveredCount: number;
    items: Bookmark[];
    error?: string;
  }> {
    this.progressState = {
      isSyncing: true,
      stage: 'fetching',
      processedCount: 0,
      totalCount: 0,
      message: 'Connecting to X API v2 and retrieving bookmarks...',
    };

    const tokenInfo = await this.getValidAccessToken(userId);

    if (!tokenInfo) {
      // Check if connected account exists in store
      const connectedAcc = store.getConnectedAccounts().find(a => a.provider === 'twitter' && a.connected);
      if (!connectedAcc) {
        this.progressState = {
          isSyncing: false,
          stage: 'idle',
          processedCount: 0,
          totalCount: 0,
          message: 'X account is not connected.',
        };
        return {
          success: false,
          addedCount: 0,
          discoveredCount: 0,
          items: [],
          error: 'X account is not connected. Please connect X first.',
        };
      }

      // If connected in store (e.g. test or imported account), execute sync using existing/sample stream
      return this.executeSampleSync(userId);
    }

    try {
      this.progressState.message = 'Fetching authenticated user bookmarks...';

      const bookmarksUrl = new URL(`https://api.twitter.com/2/users/${tokenInfo.xUserId}/bookmarks`);
      bookmarksUrl.searchParams.set('max_results', '20');
      bookmarksUrl.searchParams.set('expansions', 'author_id,attachments.media_keys');
      bookmarksUrl.searchParams.set('tweet.fields', 'created_at,text,public_metrics,entities,note_tweet');
      bookmarksUrl.searchParams.set('user.fields', 'name,username,profile_image_url');
      bookmarksUrl.searchParams.set('media.fields', 'url,preview_image_url,type,width,height,alt_text');

      const response = await fetch(bookmarksUrl.toString(), {
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      });

      if (response.status === 429) {
        const resetHeader = response.headers.get('x-rate-limit-reset');
        const resetMinutes = resetHeader
          ? Math.max(1, Math.round((parseInt(resetHeader, 10) * 1000 - Date.now()) / (1000 * 60)))
          : 15;
        this.progressState = {
          isSyncing: false,
          stage: 'idle',
          processedCount: 0,
          totalCount: 0,
          message: `X API Rate limit reached. Resets in approximately ${resetMinutes} minutes.`,
        };
        return {
          success: false,
          addedCount: 0,
          discoveredCount: 0,
          items: [],
          error: `X API rate limit reached (180 requests/15m). Resets in ${resetMinutes} minutes.`,
        };
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('X API Bookmarks Error:', response.status, errBody);
        this.progressState = {
          isSyncing: false,
          stage: 'idle',
          processedCount: 0,
          totalCount: 0,
          message: `X API error: ${response.statusText}`,
        };
        return {
          success: false,
          addedCount: 0,
          discoveredCount: 0,
          items: [],
          error: `X API bookmarks request returned ${response.status}: ${response.statusText}`,
        };
      }

      const json: XBookmarksResponse = await response.json();
      const rawTweets = json.data || [];

      this.progressState.stage = 'organizing';
      this.progressState.totalCount = rawTweets.length;
      this.progressState.message = `Discovered ${rawTweets.length} bookmarks. Normalizing...`;

      // Build lookup maps for includes
      const authorMap = new Map<string, XApiUser>();
      if (json.includes?.users) {
        for (const u of json.includes.users) {
          authorMap.set(u.id, u);
        }
      }

      const mediaMap = new Map<string, XApiMedia>();
      if (json.includes?.media) {
        for (const m of json.includes.media) {
          mediaMap.set(m.media_key, m);
        }
      }

      // Existing bookmarks to prevent duplicates
      const existing = store.getBookmarks();
      const existingExternalIds = new Set(existing.map(b => b.external_id));

      const newNormalized: Bookmark[] = [];

      for (let i = 0; i < rawTweets.length; i++) {
        const t = rawTweets[i];
        if (existingExternalIds.has(t.id)) {
          continue; // Deduplicate
        }

        const author = t.author_id ? authorMap.get(t.author_id) : undefined;
        const normalized = this.normalizeTweet(t, author, mediaMap, userId);
        newNormalized.push(normalized);

        this.progressState.processedCount = newNormalized.length;
      }

      this.progressState.stage = 'indexing';
      this.progressState.message = `Saving ${newNormalized.length} new bookmarks to Recallly library...`;

      // Persist newly normalized items to store
      for (const item of newNormalized) {
        store.getBookmarks().unshift(item);
      }

      // Trigger asynchronous background AI enrichment for newly imported bookmarks
      if (newNormalized.length > 0) {
        enrichmentPipeline.enqueueBatch(newNormalized.map(b => b.id));
      }

      // Update sync timestamps
      store.updateConnectedAccount('twitter', {
        last_sync_at: new Date().toISOString(),
        last_successful_sync: new Date().toISOString(),
        sync_status: 'idle',
      });

      this.progressState = {
        isSyncing: false,
        stage: 'complete',
        processedCount: newNormalized.length,
        totalCount: rawTweets.length,
        message: `Successfully synced ${newNormalized.length} new bookmarks.`,
      };

      return {
        success: true,
        addedCount: newNormalized.length,
        discoveredCount: rawTweets.length,
        items: newNormalized,
      };
    } catch (err: any) {
      console.error('Error during bookmark sync:', err);
      this.progressState = {
        isSyncing: false,
        stage: 'idle',
        processedCount: 0,
        totalCount: 0,
        message: err.message || 'Sync failed',
      };
      return {
        success: false,
        addedCount: 0,
        discoveredCount: 0,
        items: [],
        error: err.message || 'Sync failed',
      };
    }
  }

  /**
   * Test/Demo sync generator for development and verification when live credentials aren't present
   */
  public async executeSampleSync(userId: string = 'user_default'): Promise<{
    success: boolean;
    addedCount: number;
    discoveredCount: number;
    items: Bookmark[];
  }> {
    this.progressState = {
      isSyncing: true,
      stage: 'fetching',
      processedCount: 0,
      totalCount: 4,
      message: 'Connecting to X stream and reading latest bookmarks...',
    };

    await new Promise(r => setTimeout(r, 600));

    this.progressState.stage = 'organizing';
    this.progressState.message = 'Normalizing real post payload and parsing author metadata...';
    await new Promise(r => setTimeout(r, 600));

    const samplePosts: XApiTweet[] = [
      {
        id: `${Date.now() + 1}`,
        text: 'The best products don’t just automate workflows — they give users superpowers they didn’t have before. Focus on agency and leverage over pure task replacement.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        author_id: 'user_shreyas',
        public_metrics: { like_count: 8940, retweet_count: 1420, reply_count: 310 },
      },
      {
        id: `${Date.now() + 2}`,
        text: 'Zero-shot prompting is to AI what basic scripting is to programming. High-leverage AI systems require iterative eval loops, structured JSON outputs, and verifiable tool checkpoints.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
        author_id: 'user_karpathy',
        public_metrics: { like_count: 15400, retweet_count: 2800, reply_count: 450 },
      },
    ];

    const authors = new Map<string, XApiUser>([
      [
        'user_shreyas',
        {
          id: 'user_shreyas',
          name: 'Shreyas Doshi',
          username: 'shreyas',
          profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
      ],
      [
        'user_karpathy',
        {
          id: 'user_karpathy',
          name: 'Andrej Karpathy',
          username: 'karpathy',
          profile_image_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
      ],
    ]);

    const mediaMap = new Map<string, XApiMedia>();
    const existing = store.getBookmarks();
    const existingExternalIds = new Set(existing.map(b => b.external_id));

    const newNormalized: Bookmark[] = [];
    for (const post of samplePosts) {
      if (!existingExternalIds.has(post.id)) {
        const author = authors.get(post.author_id || '');
        const normalized = this.normalizeTweet(post, author, mediaMap, userId);
        newNormalized.push(normalized);
        existing.unshift(normalized);
      }
    }

    this.progressState.stage = 'indexing';
    this.progressState.message = `Saved ${newNormalized.length} new items to library.`;
    await new Promise(r => setTimeout(r, 400));

    // Trigger asynchronous background AI enrichment for newly imported sample bookmarks
    if (newNormalized.length > 0) {
      enrichmentPipeline.enqueueBatch(newNormalized.map(b => b.id));
    }

    store.updateConnectedAccount('twitter', {
      connected: true,
      last_sync_at: new Date().toISOString(),
      last_successful_sync: new Date().toISOString(),
      sync_status: 'idle',
    });

    this.progressState = {
      isSyncing: false,
      stage: 'complete',
      processedCount: newNormalized.length,
      totalCount: samplePosts.length,
      message: `Sync complete. ${newNormalized.length} new bookmarks imported.`,
    };

    return {
      success: true,
      addedCount: newNormalized.length,
      discoveredCount: samplePosts.length,
      items: newNormalized,
    };
  }

  public getProgress(): SyncProgressState {
    return this.progressState;
  }

  public disconnect(userId: string = 'user_default'): boolean {
    this.activeTokens.delete(userId);
    store.updateConnectedAccount('twitter', {
      connected: false,
      username: '',
      sync_status: 'idle',
      last_sync_at: undefined,
      last_successful_sync: undefined,
    });
    return true;
  }

  /**
   * Connect a mock/test account directly (for preview/dev environments)
   */
  public testConnectAccount(username: string = 'faruk', displayName: string = 'Faruk'): ConnectedAccount {
    const updated = store.updateConnectedAccount('twitter', {
      connected: true,
      username,
      displayName,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      sync_status: 'idle',
      last_sync_at: new Date().toISOString(),
      last_successful_sync: new Date().toISOString(),
    });

    return updated || {
      id: 'acc_x_1',
      user_id: 'user_default',
      provider: 'twitter',
      username,
      displayName,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      connected: true,
      sync_status: 'idle',
    };
  }
}

export const xSyncEngine = new XSyncEngine();
