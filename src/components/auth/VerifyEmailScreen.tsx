import { CheckCircle2, LogOut, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { formatAuthError, useAuth } from '@/src/contexts/AuthContext';

export function VerifyEmailScreen() {
  const { user, resendVerificationEmail, refreshUserVerification, logout } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRefresh = async () => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const verified = await refreshUserVerification();
      if (!verified) {
        setStatusMessage('Email is not verified yet. Please check your inbox and spam folder.');
      }
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await resendVerificationEmail();
      setStatusMessage('Verification email sent. Check your inbox.');
    } catch (err) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-5">
        <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Mail className="h-5 w-5" />
        </div>

        <div>
          <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Verify your email address
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            To protect your private job search records, we sent a verification link to{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {user?.email}
            </span>
            . Open the link, then click below to continue.
          </p>
        </div>

        {statusMessage && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <Button type="button" className="w-full" onClick={handleRefresh} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
            <span>I have verified my email</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={busy}
          >
            Resend verification email
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-slate-500"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
