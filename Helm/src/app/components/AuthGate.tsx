import { useState, useEffect } from 'react';
import { get } from '../api/meridian';
import { AuthPage } from '../pages/AuthPage';
import { Dashboard } from '../pages/Dashboard';
import { toast } from 'sonner';

type AuthUser = { id: string; email?: string; name?: string; initials?: string } | null;

export function AuthGate() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<{ user: AuthUser }>('/api/auth/me')
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'failed') {
      toast.error('Sign-in was cancelled or failed. Try again.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('auth') === 'ok') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={setUser} />;
  }

  return (
    <Dashboard
      currentUser={user}
      onLogout={() => setUser(null)}
    />
  );
}
