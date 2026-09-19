import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Environment variable extraction supporting Vite (VITE_) and Next/Node conventions
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const procEnv = typeof process !== 'undefined' ? process.env : undefined;

const supabaseUrl: string =
  metaEnv?.VITE_SUPABASE_URL ||
  procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv?.VITE_SUPABASE_URL ||
  '';

const supabaseAnonKey: string =
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv?.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
  );
};

// Lazy initialization client singleton
let clientInstance: SupabaseClient<Database> | null = null;

export const getSupabase = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return clientInstance;
};

let adminInstance: SupabaseClient<Database> | null = null;

export const getSupabaseAdmin = (): SupabaseClient<Database> | null => {
  const serviceRoleKey = procEnv?.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!adminInstance) {
    adminInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminInstance;
};

