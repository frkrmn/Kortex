// Supabase Database Type Definitions
// Compliant with @supabase/supabase-js v2 schema type conventions

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      connected_accounts: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_user_id: string | null;
          username: string | null;
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
          token_expires_at: string | null;
          last_sync_at: string | null;
          last_successful_sync_at: string | null;
          sync_cursor: string | null;
          sync_status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_user_id?: string | null;
          username?: string | null;
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          last_sync_at?: string | null;
          last_successful_sync_at?: string | null;
          sync_cursor?: string | null;
          sync_status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          provider_user_id?: string | null;
          username?: string | null;
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          last_sync_at?: string | null;
          last_successful_sync_at?: string | null;
          sync_cursor?: string | null;
          sync_status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          external_id: string | null;
          content: string;
          url: string | null;
          author_id: string | null;
          author_name: string | null;
          author_username: string | null;
          author_avatar_url: string | null;
          media: Json;
          published_at: string | null;
          saved_at: string;
          imported_at: string;
          summary: string | null;
          language: string | null;
          is_read: boolean;
          is_favorite: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          external_id?: string | null;
          content: string;
          url?: string | null;
          author_id?: string | null;
          author_name?: string | null;
          author_username?: string | null;
          author_avatar_url?: string | null;
          media?: Json;
          published_at?: string | null;
          saved_at?: string;
          imported_at?: string;
          summary?: string | null;
          language?: string | null;
          is_read?: boolean;
          is_favorite?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          external_id?: string | null;
          content?: string;
          url?: string | null;
          author_id?: string | null;
          author_name?: string | null;
          author_username?: string | null;
          author_avatar_url?: string | null;
          media?: Json;
          published_at?: string | null;
          saved_at?: string;
          imported_at?: string;
          summary?: string | null;
          language?: string | null;
          is_read?: boolean;
          is_favorite?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_item_topics: {
        Row: {
          saved_item_id: string;
          topic_id: string;
          confidence: number;
          created_at: string;
        };
        Insert: {
          saved_item_id: string;
          topic_id: string;
          confidence?: number;
          created_at?: string;
        };
        Update: {
          saved_item_id?: string;
          topic_id?: string;
          confidence?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          visibility: 'private' | 'public';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          visibility?: 'private' | 'public';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          visibility?: 'private' | 'public';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collection_items: {
        Row: {
          collection_id: string;
          saved_item_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          saved_item_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          collection_id?: string;
          saved_item_id?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      digests: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          status: 'draft' | 'sent' | 'archived';
          title: string;
          summary: string | null;
          content: Json;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          status?: 'draft' | 'sent' | 'archived';
          title: string;
          summary?: string | null;
          content?: Json;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          status?: 'draft' | 'sent' | 'archived';
          title?: string;
          summary?: string | null;
          content?: Json;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      digest_settings: {
        Row: {
          id: string;
          user_id: string;
          frequency: 'daily' | 'weekly' | 'monthly' | 'off';
          delivery_day: number;
          delivery_time: string;
          timezone: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          frequency?: 'daily' | 'weekly' | 'monthly' | 'off';
          delivery_day?: number;
          delivery_time?: string;
          timezone?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          frequency?: 'daily' | 'weekly' | 'monthly' | 'off';
          delivery_day?: number;
          delivery_time?: string;
          timezone?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          sources: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          role?: 'user' | 'assistant' | 'system';
          content: string;
          sources?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          user_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          sources?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          plan: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_jobs: {
        Row: {
          id: string;
          user_id: string;
          connected_account_id: string | null;
          provider: string;
          status: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          cursor: string | null;
          items_discovered: number;
          items_processed: number;
          error_code: string | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          connected_account_id?: string | null;
          provider: string;
          status?: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          cursor?: string | null;
          items_discovered?: number;
          items_processed?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          connected_account_id?: string | null;
          provider?: string;
          status?: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          cursor?: string | null;
          items_discovered?: number;
          items_processed?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          saved_item_id: string | null;
          job_type: string;
          status: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          attempts: number;
          max_attempts: number;
          error_code: string | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          saved_item_id?: string | null;
          job_type: string;
          status?: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          attempts?: number;
          max_attempts?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          saved_item_id?: string | null;
          job_type?: string;
          status?: 'pending' | 'running' | 'processing' | 'completed' | 'failed';
          attempts?: number;
          max_attempts?: number;
          error_code?: string | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      connected_accounts_safe: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_user_id: string | null;
          username: string | null;
          sync_status: string;
          last_sync_at: string | null;
          last_successful_sync_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
