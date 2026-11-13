import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, CheckCircle2, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { formatAuthError, useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';

type AuthMode = 'login' | 'register' | 'reset';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name (at least 2 characters).').max(120),
    email: z.string().email('Enter a valid email address.').max(254),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(6, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const resetSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

export function AuthPage() {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, sendPasswordReset } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  });

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setAuthError(null);
    setAuthNotice(null);
  };

  const handleGoogle = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setAuthError(null);
    setAuthNotice(null);
    setSubmitting(true);
    try {
      await signInWithEmail(values.email, values.password);
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (values: z.infer<typeof registerSchema>) => {
    setAuthError(null);
    setAuthNotice(null);
    setSubmitting(true);
    try {
      await registerWithEmail(values.name, values.email, values.password);
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async (values: z.infer<typeof resetSchema>) => {
    setAuthError(null);
    setAuthNotice(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(values.email);
      setAuthNotice('Password reset instructions have been sent to your email.');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <span className="font-display text-lg font-bold tracking-tight">CareerFlow</span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-16 gap-8 lg:gap-12 items-center">
        <section className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Personal Career Workspace
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              Make every job application organized and every decision informed.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
              Track roles across every interview stage, keep recruiter contacts and tailored resumes organized, and maintain a reliable timeline of your entire job search.
            </p>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 sm:pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                14-Stage Pipeline Tracking
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Move seamlessly between Kanban boards, sortable tables, and full activity timelines.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Private Cloud Persistence
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Every application record is isolated strictly to your authenticated account.
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-6">
          <div className="max-w-md mx-auto w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8">
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {mode === 'login' && 'Sign in to CareerFlow'}
                {mode === 'register' && 'Create your account'}
                {mode === 'reset' && 'Reset your password'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login' && 'Access your saved job applications and career profile.'}
                {mode === 'register' && 'Start tracking your job applications in minutes.'}
                {mode === 'reset' && 'Enter your email to receive a password reset link.'}
              </p>
            </div>

            {authError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-3 text-xs text-red-700 dark:text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authNotice && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-3 text-xs text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authNotice}</span>
              </div>
            )}

            {mode !== 'reset' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 font-medium"
                  onClick={handleGoogle}
                  disabled={submitting}
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">
                      or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email address</Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="login-password" className="mb-0">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      {...loginForm.register('password')}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">Full name</Label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Alex Rivera"
                      className="pl-9"
                      {...registerForm.register('name')}
                    />
                  </div>
                  {registerForm.formState.errors.name && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {registerForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reg-email">Email address</Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      {...registerForm.register('email')}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      className="pl-9"
                      {...registerForm.register('password')}
                    />
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="reg-confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Re-enter password"
                      className="pl-9"
                      {...registerForm.register('confirmPassword')}
                    />
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Account email address</Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9"
                      {...resetForm.register('email')}
                    />
                  </div>
                  {resetForm.formState.errors.email && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {resetForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  <span>{submitting ? 'Sending link...' : 'Send Reset Link'}</span>
                </Button>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' && (
                <span>
                  New to CareerFlow?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </span>
              )}
              {mode === 'register' && (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              )}
              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
