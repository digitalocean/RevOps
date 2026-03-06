import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { post } from '../api/meridian';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: { id: string; email?: string; name?: string; initials?: string }) => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
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
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl shadow-xl border-0 bg-white p-8">
        <DialogHeader className="space-y-1 text-center sm:text-left">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'Enter your email and password.' : 'Register to get started.'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
          <div className="flex flex-col gap-2 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
