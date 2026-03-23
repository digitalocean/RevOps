import { LogOut, ShieldAlert } from 'lucide-react';
import { post } from '../api/meridian';

type AccessDeniedPageProps = {
  message: string;
  userEmail?: string | null;
  onLogout: () => void;
};

export function AccessDeniedPage({ message, userEmail, onLogout }: AccessDeniedPageProps) {
  const handleSignOut = async () => {
    try {
      await post('/api/auth/logout', {});
    } catch {
      /* still clear UI */
    }
    onLogout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/20 px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200/80 bg-white p-8 shadow-lg shadow-amber-900/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-center text-lg font-semibold text-gray-900">Access not enabled</h1>
        {userEmail ? (
          <p className="mt-1 text-center text-sm text-gray-500 break-all">{userEmail}</p>
        ) : null}
        <p className="mt-5 text-center text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {message}
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}
