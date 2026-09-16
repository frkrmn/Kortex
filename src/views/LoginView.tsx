import React, { useState } from 'react';
import { Layers, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth/auth-context';
import { sanitizeRedirectPath } from '../lib/auth/redirect';

export const LoginView: React.FC = () => {
  const { navigate, searchParams } = useRouter();
  const { signInWithPassword, signInWithGoogle, isDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nextDestination = sanitizeRedirectPath(searchParams.get('next'), '/dashboard');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Please enter both your email and password.');
      return;
    }

    setFormError(null);
    setIsLoading(true);

    try {
      const res = await signInWithPassword(email, password);
      if (res.success) {
        navigate(nextDestination);
      } else {
        setFormError(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch (err) {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setFormError(res.error || 'Google sign-in is not configured yet in this project.');
      }
    } catch (err) {
      setFormError('Google sign-in error. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2.5 cursor-pointer mb-8"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#171717]">Recallly</span>
        </div>

        {/* Card Container */}
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E8E8E5] rounded-3xl shadow-xs">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-[#70706B] mt-1.5">
              Your saved knowledge is waiting.
            </p>
          </div>

          {/* Error Banner */}
          {formError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A0A09B] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF] transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#171717]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-[#70706B] hover:text-[#171717] font-medium transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A0A09B] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF] transition-all disabled:opacity-50"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-[#E8E8E5]" />
            <span className="px-3 text-[11px] font-medium uppercase tracking-wider text-[#8A8A85]">
              Or
            </span>
            <div className="flex-1 border-t border-[#E8E8E5]" />
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E0E0DC] hover:border-[#171717] hover:bg-[#F9F9F7] text-[#171717] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#70706B]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Demo Mode Quick Access Notice */}
          {isDemo && (
            <div className="mt-5 p-3 rounded-xl bg-[#F4F4F1] border border-[#E5E5E0] text-center">
              <p className="text-[11px] text-[#70706B]">
                Demo Mode active. Want to explore the app immediately?
              </p>
              <button
                type="button"
                onClick={() => navigate(nextDestination)}
                className="mt-1 text-xs font-semibold text-[#171717] hover:underline cursor-pointer"
              >
                Enter as Demo User →
              </button>
            </div>
          )}

          {/* Footer Link */}
          <div className="mt-6 text-center text-xs text-[#70706B]">
            <span>Don't have an account? </span>
            <button
              onClick={() => navigate(`/signup${searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next')!)}` : ''}`)}
              className="font-semibold text-[#171717] hover:underline cursor-pointer"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
