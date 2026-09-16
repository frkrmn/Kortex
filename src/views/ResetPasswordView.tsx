import React, { useState } from 'react';
import { Layers, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth/auth-context';

export const ResetPasswordView: React.FC = () => {
  const { navigate } = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setFormError(null);
    setIsLoading(true);

    try {
      const res = await updatePassword(password);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setFormError(res.error || 'Failed to update password. Your reset link may have expired.');
      }
    } catch {
      setFormError('An unexpected error occurred. Please try requesting a new reset link.');
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
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#171717]">
                Password updated!
              </h2>
              <p className="text-xs sm:text-sm text-[#70706B]">
                Your password has been reset successfully. Redirecting you to your dashboard...
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-medium cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
                  Set new password
                </h1>
                <p className="text-xs sm:text-sm text-[#70706B] mt-1.5">
                  Choose a new password for your Recallly account.
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
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
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

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-[#171717] mb-1.5"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Repeat new password"
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
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
