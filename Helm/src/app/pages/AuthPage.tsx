import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Anchor } from 'lucide-react';
import { Button } from '../components/ui/button';
import { get, post } from '../api/meridian';

interface AuthPageProps {
  onSuccess: (user: { id: string; email?: string; name?: string; initials?: string }) => void;
}

interface AuthProviders {
  okta: boolean;
  saml?: boolean;
  dev?: boolean;
  /** True when API has AUTH_SAMPLE_MODE=true (email/password in production for demos). */
  sampleMode?: boolean;
}

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  initials?: string;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders>({ okta: false, saml: false, dev: false, sampleMode: false });

  // Dev-only email/password form state (mode, fields, submit handler).
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [devSubmitting, setDevSubmitting] = useState(false);

  useEffect(() => {
    get<AuthProviders>('/api/auth/providers')
      .then((p) =>
        setProviders({
          okta: !!p.okta,
          saml: !!p.saml,
          dev: !!p.dev,
          sampleMode: !!p.sampleMode,
        })
      )
      .catch(() => setProviders({ okta: false, saml: false, dev: false, sampleMode: false }));
  }, []);

  const handleSamlSignIn = () => {
    setLoading(true);
    window.location.href = '/api/auth/saml';
  };

  const handleOktaSignIn = () => {
    setLoading(true);
    window.location.href = '/api/auth/okta';
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Email is required'); return; }
    if (!password) { toast.error('Password is required'); return; }
    if (mode === 'register' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setDevSubmitting(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: email.trim().toLowerCase(), password }
        : {
            email: email.trim().toLowerCase(),
            password,
            name: name.trim() || email.trim().split('@')[0],
          };
      const data = await post<{ user: AuthUser }>(path, body);
      if (data.user) {
        onSuccess(data.user);
        setEmail(''); setPassword(''); setName('');
        toast.success(mode === 'register' ? 'Account created' : 'Signed in');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setDevSubmitting(false);
    }
  };

  const hasSso = providers.okta || providers.saml;

  if (!hasSso && !providers.dev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#F6F7FB]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.10), transparent 40%), radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.08), transparent 40%)',
        }}>
        <div className="w-full max-w-md text-center">
          <span className="inline-flex w-14 h-14 mb-5 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)]">
            <Anchor className="w-6 h-6" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in unavailable</h1>
          <p className="text-gray-500 mt-4">SSO is not configured. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#F6F7FB]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.10), transparent 40%), radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.08), transparent 40%)',
      }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex w-14 h-14 mb-4 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)]">
            <Anchor className="w-6 h-6" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ToDo</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Get things done. Sign in to continue.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] border border-[var(--border-soft)] p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">
            {hasSso
              ? 'Use your organization account'
              : providers.sampleMode
                ? 'Sample app — sign in or register with email'
                : 'Development mode'}
          </p>

          {hasSso && (
            <button
              type="button"
              onClick={providers.saml ? handleSamlSignIn : handleOktaSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:ring-[3px] focus:ring-indigo-100 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(79,70,229,0.30)] hover:shadow-[0_6px_18px_rgba(79,70,229,0.40)]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecting…
                </span>
              ) : (
                <>
                  <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  {providers.saml ? 'Sign in with SSO' : 'Sign in with Okta'}
                </>
              )}
            </button>
          )}

          {providers.dev && (
            <div className={hasSso ? 'mt-6' : ''}>
              {hasSso && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Development
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-900">
                {providers.sampleMode ? (
                  <>
                    <strong className="font-semibold">Sample sign-in</strong> — email/password is enabled via{' '}
                    <code className="rounded bg-amber-100/80 px-1">AUTH_SAMPLE_MODE</code> on the API. Remove it and
                    configure Okta/SAML for production SSO; anyone can register while this is on.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold">Dev sign-in</strong> — email/password is enabled because the
                    API is running in non-production mode. This form is hidden automatically when{' '}
                    <code className="rounded bg-amber-100/80 px-1">NODE_ENV=production</code> unless sample mode is on.
                  </>
                )}
              </div>

              <div className="flex gap-1 mb-4 p-1 bg-[var(--secondary)] rounded-lg" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => setMode('login')}
                  className={`flex-1 h-8 rounded-md text-sm font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => setMode('register')}
                  className={`flex-1 h-8 rounded-md text-sm font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleDevSubmit} className="space-y-3">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="dev-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Name
                    </label>
                    <input
                      id="dev-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Optional"
                      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] focus:outline-none focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-100 transition-all"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="dev-email" className="block text-xs font-medium text-gray-600 mb-1.5">
                    Email
                  </label>
                  <input
                    id="dev-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] focus:outline-none focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="dev-password" className="block text-xs font-medium text-gray-600 mb-1.5">
                    Password
                  </label>
                  <input
                    id="dev-password"
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'register' ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] focus:outline-none focus:border-indigo-400 focus:ring-[3px] focus:ring-indigo-100 transition-all"
                  />
                </div>
                <Button type="submit" disabled={devSubmitting} className="w-full h-10 mt-2">
                  {devSubmitting
                    ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                    : (mode === 'login' ? 'Sign in' : 'Create account')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
