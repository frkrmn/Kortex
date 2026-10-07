import React, { useState } from 'react';
import { Layers, ArrowRight, Loader2, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth/auth-context';
import { sanitizeRedirectPath } from '../lib/auth/redirect';

export const SignupView: React.FC = () => {
  const { navigate, searchParams } = useRouter();
  const { signUp, resendVerificationEmail } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Email verification state
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const nextDestination = sanitizeRedirectPath(searchParams.get('next'), '/onboarding');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setFormError(null);
    setIsLoading(true);

    try {
      const res = await signUp(email, password, name, nextDestination);
      if (res.success) {
        if (res.requiresVerification) {
          setPendingVerificationEmail(email.trim());
        } else {
          // Direct login or email confirmation disabled in Supabase
          navigate(nextDestination);
        }
      } else {
        setFormError(res.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingVerificationEmail) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendVerificationEmail(pendingVerificationEmail, nextDestination);
      if (res.success) {
        setResendStatus('Verification email resent! Please check your inbox.');
      } else {
        setResendStatus(res.error || 'Unable to resend email right now. Please wait a moment.');
      }
    } catch {
      setResendStatus('Unable to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // If waiting for email verification
  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2.5 cursor-pointer mb-8"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#171717]">Find Again</span>
          </div>

          <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E8E8E5] rounded-3xl shadow-xs text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#171717]">
                Check your inbox
              </h2>
              <p className="text-xs sm:text-sm text-[#70706B] mt-2 leading-relaxed">
                We sent a verification link to:
              </p>
              <p className="font-semibold text-xs sm:text-sm text-[#171717] mt-1 break-all">
                {pendingVerificationEmail}
              </p>
              <p className="text-[11px] text-[#8A8A85] mt-2">
                Click the link in your email to activate your account and start your knowledge base.
              </p>
            </div>

            {resendStatus && (
              <div className="p-3 rounded-xl bg-[#F4F4F1] border border-[#E0E0DC] text-xs text-[#171717] flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resendStatus}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-2.5 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <span>Resend verification email</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingVerificationEmail(null);
                  setResendStatus(null);
                }}
                className="w-full py-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
              >
                Use another email address
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <span className="font-bold text-xl tracking-tight text-[#171717]">Find Again</span>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E8E8E5] rounded-3xl shadow-xs">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
              Build a better memory for the internet.
            </h1>
            <p className="text-xs sm:text-sm text-[#70706B] mt-1.5 leading-relaxed">
              Organize, search, and converse with everything you bookmark.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Your name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A0A09B] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF] transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Email address
              </label>
              <input
                id="signup-email"
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
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold text-[#171717] mb-1.5"
              >
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="At least 6 characters"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A0A09B] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF] transition-all disabled:opacity-50"
              />
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Legal Agreement */}
          <p className="mt-5 text-[11px] text-[#8A8A85] text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="text-[#171717] hover:underline cursor-pointer font-medium"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="text-[#171717] hover:underline cursor-pointer font-medium"
            >
              Privacy Policy
            </button>
            .
          </p>

          {/* Footer Link */}
          <div className="mt-6 text-center text-xs text-[#70706B] border-t border-[#F0F0EC] pt-4">
            <span>Already have an account? </span>
            <button
              onClick={() => navigate(`/login${searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next')!)}` : ''}`)}
              className="font-semibold text-[#171717] hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
