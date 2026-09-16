import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';
import { isDemoMode } from '../repositories';
import { UserProfile } from '../../types';
import { demoUser } from '../demo-data';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isDemo: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;

  // Actions
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null>;
  completeOnboarding: (displayName: string, timezone: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapAuthErrorMessage(err: AuthError | Error | null | unknown): string {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const message = (err as any)?.message || String(err);

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please check your email inbox to verify your account before signing in.';
  }
  if (message.includes('User already registered') || message.includes('already registered')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('rate limit') || message.includes('Too many requests')) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network connection error. Please check your connection and try again.';
  }

  return message;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    return isDemoMode() ? demoUser : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const supabase = getSupabase();
  const demoActive = isDemoMode();

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Fetch or idempotently create profile for authenticated user
  const loadUserProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (data) {
        const loadedProfile: UserProfile = {
          id: data.id,
          user_id: data.user_id,
          display_name: data.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member',
          email: authUser.email || '',
          avatar_url: data.avatar_url || authUser.user_metadata?.avatar_url || '',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          created_at: data.created_at,
          has_onboarded: Boolean(data.onboarding_completed_at),
          onboarding_completed_at: data.onboarding_completed_at || null,
          plan: 'pro',
        };
        setProfile(loadedProfile);
        return loadedProfile;
      }

      // Safe idempotent creation if missing
      const defaultName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split('@')[0] : 'Member');
      const avatar =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        null;
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.id,
          display_name: defaultName,
          avatar_url: avatar,
          timezone: detectedTz,
        })
        .select()
        .single();

      if (created) {
        const newProfile: UserProfile = {
          id: created.id,
          user_id: created.user_id,
          display_name: created.display_name || defaultName,
          email: authUser.email || '',
          avatar_url: created.avatar_url || '',
          timezone: created.timezone || detectedTz,
          created_at: created.created_at,
          has_onboarded: Boolean(created.onboarding_completed_at),
          onboarding_completed_at: created.onboarding_completed_at || null,
          plan: 'pro',
        };
        setProfile(newProfile);
        return newProfile;
      }

      if (insertErr) {
        console.warn('Profile creation notice:', insertErr.message);
      }
    } catch (e) {
      console.warn('Error loading user profile:', e);
    }

    return null;
  }, [supabase]);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      // In demo mode or when Supabase is not configured
      if (demoActive) {
        setProfile(demoUser);
      }
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession notice:', error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await loadUserProfile(initialSession.user);
          } else if (demoActive) {
            setProfile(demoUser);
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn('Auth init failed:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          await loadUserProfile(currentSession.user);
        } else {
          if (demoActive) {
            setProfile(demoUser);
          } else {
            setProfile(null);
          }
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, demoActive, loadUserProfile]);

  // Sign In with Email & Password
  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setAuthError(null);
      if (!isSupabaseConfigured() || !supabase) {
        // Fallback in demo mode if Supabase env credentials are not yet configured
        return {
          success: false,
          error: 'Supabase authentication is not configured in this environment. Running in Demo Mode.',
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          const friendlyMsg = mapAuthErrorMessage(error);
          setAuthError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        if (data.user) {
          setUser(data.user);
          setSession(data.session);
          await loadUserProfile(data.user);
        }

        return { success: true };
      } catch (err) {
        const friendlyMsg = mapAuthErrorMessage(err);
        setAuthError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
    },
    [supabase, loadUserProfile]
  );

  // Sign Up with Email & Password
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string
    ): Promise<{ success: boolean; requiresVerification?: boolean; error?: string }> => {
      setAuthError(null);
      if (!isSupabaseConfigured() || !supabase) {
        return {
          success: false,
          error: 'Supabase authentication is not configured in this environment.',
        };
      }

      try {
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: displayName?.trim() || '',
              name: displayName?.trim() || '',
            },
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });

        if (error) {
          const friendlyMsg = mapAuthErrorMessage(error);
          setAuthError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        // If email confirmation is required by Supabase, data.session is null and data.user is present
        const requiresVerification = Boolean(data.user && !data.session);

        if (data.user && data.session) {
          setUser(data.user);
          setSession(data.session);
          await loadUserProfile(data.user);
        }

        return { success: true, requiresVerification };
      } catch (err) {
        const friendlyMsg = mapAuthErrorMessage(err);
        setAuthError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
    },
    [supabase, loadUserProfile]
  );

  // Sign In with Google OAuth (graceful handling)
  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Supabase credentials are required to use Google authentication.',
      };
    }

    try {
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        const friendlyMsg = mapAuthErrorMessage(error);
        setAuthError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      return { success: true };
    } catch (err) {
      const friendlyMsg = mapAuthErrorMessage(err);
      setAuthError(friendlyMsg);
      return { success: false, error: friendlyMsg };
    }
  }, [supabase]);

  // Sign Out
  const signOut = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out notice:', e);
      }
    }
    setUser(null);
    setSession(null);
    if (demoActive) {
      setProfile(demoUser);
    } else {
      setProfile(null);
    }
  }, [supabase, demoActive]);

  // Forgot password
  const resetPasswordForEmail = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      setAuthError(null);
      if (!isSupabaseConfigured() || !supabase) {
        return {
          success: false,
          error: 'Supabase authentication is not configured in this environment.',
        };
      }

      try {
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${siteUrl}/reset-password`,
        });

        if (error) {
          const friendlyMsg = mapAuthErrorMessage(error);
          setAuthError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        return { success: true };
      } catch (err) {
        const friendlyMsg = mapAuthErrorMessage(err);
        setAuthError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
    },
    [supabase]
  );

  // Update password (on /reset-password)
  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
      setAuthError(null);
      if (!supabase) {
        return { success: false, error: 'Auth client not available' };
      }

      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          const friendlyMsg = mapAuthErrorMessage(error);
          setAuthError(friendlyMsg);
          return { success: false, error: friendlyMsg };
        }

        return { success: true };
      } catch (err) {
        const friendlyMsg = mapAuthErrorMessage(err);
        setAuthError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
    },
    [supabase]
  );

  // Resend verification email
  const resendVerificationEmail = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      if (!supabase) return { success: false, error: 'Auth client unavailable' };
      try {
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });

        if (error) {
          return { success: false, error: mapAuthErrorMessage(error) };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: mapAuthErrorMessage(err) };
      }
    },
    [supabase]
  );

  // Update profile
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<UserProfile | null> => {
      if (!user && !demoActive) return null;

      // In demo mode
      if (demoActive && !user) {
        setProfile((prev) => {
          const current = prev || demoUser;
          const next = { ...current, ...updates };
          try {
            localStorage.setItem('recallly_demo_profile_v1', JSON.stringify(next));
          } catch {}
          return next;
        });
        return profile;
      }

      if (!supabase || !user) return null;

      try {
        const dbUpdates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
        if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
        if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
        if (updates.has_onboarded === true || updates.onboarding_completed_at) {
          dbUpdates.onboarding_completed_at = updates.onboarding_completed_at || new Date().toISOString();
        }

        const { data, error } = await (supabase
          .from('profiles')
          .update(dbUpdates as any)
          .eq('user_id', user.id)
          .select()
          .single() as any);

        if (error || !data) {
          console.error('Failed to update profile in database:', error);
          return null;
        }

        const updated: UserProfile = {
          id: data.id,
          user_id: data.user_id,
          display_name: data.display_name || '',
          email: user.email || '',
          avatar_url: data.avatar_url || '',
          timezone: data.timezone || 'UTC',
          created_at: data.created_at,
          has_onboarded: Boolean(data.onboarding_completed_at),
          onboarding_completed_at: data.onboarding_completed_at || null,
          plan: 'pro',
        };

        setProfile(updated);
        return updated;
      } catch (e) {
        console.error('Profile update error:', e);
        return null;
      }
    },
    [supabase, user, demoActive, profile]
  );

  // Complete onboarding
  const completeOnboarding = useCallback(
    async (displayName: string, timezone: string): Promise<boolean> => {
      const completedTimestamp = new Date().toISOString();

      if (demoActive && !user) {
        setProfile((prev) => ({
          ...(prev || demoUser),
          display_name: displayName || prev?.display_name || demoUser.display_name,
          timezone: timezone || prev?.timezone || demoUser.timezone,
          has_onboarded: true,
          onboarding_completed_at: completedTimestamp,
        }));
        return true;
      }

      if (!supabase || !user) return false;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            display_name: displayName.trim(),
            timezone: timezone.trim(),
            onboarding_completed_at: completedTimestamp,
            updated_at: completedTimestamp,
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error || !data) {
          console.warn('Profile onboarding update fallback:', error?.message);
        }

        setProfile({
          id: data?.id || user.id,
          user_id: user.id,
          display_name: displayName.trim() || user.email?.split('@')[0] || 'Member',
          email: user.email || '',
          avatar_url: data?.avatar_url || '',
          timezone: timezone.trim() || 'UTC',
          created_at: data?.created_at || completedTimestamp,
          has_onboarded: true,
          onboarding_completed_at: completedTimestamp,
          plan: 'pro',
        });

        return true;
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
        return false;
      }
    },
    [supabase, user, demoActive]
  );

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfile(currentUser);
      }
    } catch (e) {
      console.warn('Failed to refresh session:', e);
    }
  }, [supabase, loadUserProfile]);

  const isAuthenticated = Boolean(user || (demoActive && profile));

  const contextValue = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isDemo: demoActive,
      isAuthenticated,
      authError,
      clearAuthError,
      signInWithPassword,
      signUp,
      signInWithGoogle,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      resendVerificationEmail,
      updateProfile,
      completeOnboarding,
      refreshSession,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      demoActive,
      isAuthenticated,
      authError,
      clearAuthError,
      signInWithPassword,
      signUp,
      signInWithGoogle,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      resendVerificationEmail,
      updateProfile,
      completeOnboarding,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
