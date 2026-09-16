import { UserProfile, ConnectedAccount, Subscription, DigestSettings } from '../../types';

export const demoUser: UserProfile = {
  id: 'user_faruk',
  user_id: 'user_faruk',
  display_name: 'Faruk',
  email: 'faruk@example.com',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  timezone: 'America/New_York (UTC-5)',
  created_at: '2025-10-01T12:00:00Z',
  has_onboarded: true,
};

export const demoConnectedAccounts: ConnectedAccount[] = [
  {
    id: 'conn_x',
    user_id: 'user_faruk',
    provider: 'twitter',
    username: '',
    displayName: 'X / Twitter',
    avatarUrl: '',
    connected: false,
    sync_status: 'idle',
  },
  {
    id: 'conn_reddit',
    user_id: 'user_faruk',
    provider: 'reddit',
    username: '',
    displayName: 'Reddit',
    avatarUrl: '',
    connected: false,
    sync_status: 'idle',
  },
  {
    id: 'conn_linkedin',
    user_id: 'user_faruk',
    provider: 'linkedin',
    username: '',
    displayName: 'LinkedIn',
    avatarUrl: '',
    connected: false,
    sync_status: 'idle',
  },
  {
    id: 'conn_youtube',
    user_id: 'user_faruk',
    provider: 'youtube',
    username: '',
    displayName: 'YouTube',
    avatarUrl: '',
    connected: false,
    sync_status: 'idle',
  },
  {
    id: 'conn_rss',
    user_id: 'user_faruk',
    provider: 'rss',
    username: '',
    displayName: 'RSS Feeds',
    avatarUrl: '',
    connected: false,
    sync_status: 'idle',
  },
];

export const demoSubscription: Subscription = {
  user_id: 'user_faruk',
  provider: 'stripe',
  status: 'trialing',
  plan: 'free_trial',
  current_period_end: '2026-10-15T00:00:00Z',
  trial_days_left: 7,
  price_monthly: 19,
};

export const demoDigestSettings: DigestSettings = {
  user_id: 'user_faruk',
  frequency: 'weekly',
  delivery_day: 'Sunday',
  delivery_time: '09:00',
  timezone: 'America/New_York (UTC-5)',
  email: 'faruk@example.com',
  enabled: true,
};
