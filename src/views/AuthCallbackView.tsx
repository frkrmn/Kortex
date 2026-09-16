import React, { useEffect, useState } from 'react';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from '../lib/router';
import { getSupabase } from '../lib/supabase/client';
import { useAuth } from '../lib/auth/auth-context';
import { sanitizeRedirectPath } from '../lib/auth/redirect';

export const AuthCallbackView: React.FC = () => {
  const { navigate, searchParams } = useRouter();
  const { refreshSession, profile } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const processCallback = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (active) navigate('/dashboard');
        return;
      }

      try {
        // Supabase client automatically processes URL hash fragments (#access_token=... or ?code=...)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          if (active) setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          await refreshSession();

          // Determine destination
          const next = sanitizeRedirectPath(searchParams.get('next'), null as any);

          if (profile && !profile.has_onboarded) {
            if (active) navigate('/onboarding');
          } else if (next) {
            if (active) navigate(next);
          } else {
            if (active) navigate('/dashboard');
          }
        } else {
          // If no session found yet, wait briefly and try once more, or go to login
          setTimeout(async () => {
            if (!active) return;
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData.session) {
              await refreshSession();
              navigate('/dashboard');
            } else {
              navigate('/login');
            }
          }, 800);
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(err?.message || 'Authentication callback failed.');
        }
      }
    };

    processCallback();

    return () => {
      active = false;
    };
  }, [navigate, searchParams, refreshSession, profile]);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col justify-center items-center py-12 px-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] p-8 border border-[#E8E8E5] rounded-3xl shadow-xs text-center space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center shadow-xs mx-auto mb-2">
          <Layers className="w-5 h-5" />
        </div>

        {errorMsg ? (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#171717]">Authentication Failed</h2>
            <p className="text-xs text-[#70706B] leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 w-full py-2 px-4 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-medium cursor-pointer"
            >
              Return to login
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#171717] mx-auto" />
            <h2 className="text-base font-bold text-[#171717]">Completing sign in...</h2>
            <p className="text-xs text-[#70706B]">
              Securing your session and preparing your library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
