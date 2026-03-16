import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { get } from '../api/meridian';

interface AuthPageProps {
  onSuccess: (user: { id: string; email?: string; name?: string; initials?: string }) => void;
}

interface AuthProviders {
  okta: boolean;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<AuthProviders>({ okta: false });

  useEffect(() => {
    get<AuthProviders>('/api/auth/providers')
      .then(setProviders)
      .catch(() => setProviders({ okta: false }));
  }, []);

  const handleOktaSignIn = () => {
    setLoading(true);
    window.location.href = '/api/auth/okta';
  };

  /* ——— Email/password login (commented out; using Okta only) ———
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Email is required'); return; }
    if (!password) { toast.error('Password is required'); return; }
    if (mode === 'register' && password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password, name: name.trim() || email.trim().split('@')[0] };
      const data = await post<{ user: { id: string; email?: string; name?: string; initials?: string } }>(path, body);
      if (data.user) {
        onSuccess(data.user);
        setEmail(''); setPassword(''); setName('');
        toast.success(mode === 'register' ? 'Account created' : 'Signed in');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };
  ——— */

  if (!providers.okta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">To-DO</h1>
          <p className="text-gray-500 mt-4">SSO (Okta) is not configured. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">To-DO</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">Use your organization account</p>

          <button
            type="button"
            onClick={handleOktaSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-14 px-6 rounded-xl font-semibold text-white bg-[#007dc1] hover:bg-[#006ba1] focus:ring-2 focus:ring-[#007dc1] focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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
                Sign in with Okta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
