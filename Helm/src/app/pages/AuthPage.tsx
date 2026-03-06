import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { post } from '../api/meridian';

interface AuthPageProps {
  onSuccess: (user: { id: string; email?: string; name?: string; initials?: string }) => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password, name: name.trim() || email.trim().split('@')[0] };
      const data = await post<{ user: { id: string; email?: string; name?: string; initials?: string } }>(path, body);
      if (data.user) {
        onSuccess(data.user);
        setEmail('');
        setPassword('');
        setName('');
        toast.success(mode === 'register' ? 'Account created' : 'Signed in');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">To-DO</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login' ? 'Enter your email and password.' : 'Register to get started.'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="auth-name" className="text-sm font-medium text-gray-700">Name</Label>
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-lg border-gray-300"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-lg border-gray-300"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="auth-password"
                type="password"
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-lg border-gray-300"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full h-11 rounded-lg font-medium" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
