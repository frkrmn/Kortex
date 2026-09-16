import React, { useState } from 'react';
import { Layers, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth/auth-context';

export const ForgotPasswordView: React.FC = () => {
  const { navigate } = useRouter();
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    setFormError(null);
    setIsLoading(true);

    try {
      const res = await resetPasswordForEmail(email);
      // Even if error is rate limit or unknown, show privacy preserving confirmation or specific error if invalid format
      if (res.success) {
        setIsSubmitted(true);
      } else {
        // Only show technical/connection error if really broken
        if (res.error?.includes('Network') || res.error?.includes('not configured')) {
          setFormError(res.error);
        } else {
          // Privacy preserving: don't reveal if account exists
          setIsSubmitted(true);
        }
      }
    } catch {
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
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

        {/* Card */}
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E8E8E5] rounded-3xl shadow-xs">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#171717]">
                  Check your email
                </h2>
                <p className="text-xs sm:text-sm text-[#70706B] mt-2 leading-relaxed">
                  If an account exists with this email, we've sent instructions to reset your password.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to login</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
                  Reset password
                </h1>
                <p className="text-xs sm:text-sm text-[#70706B] mt-1.5 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
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
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="reset-email"
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>Send reset link</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs">
                <button
                  onClick={() => navigate('/login')}
                  className="text-[#70706B] hover:text-[#171717] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
