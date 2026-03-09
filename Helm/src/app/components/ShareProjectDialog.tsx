import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { get, post, del } from '../api/meridian';

interface Member {
  id: string;
  crew_id: string;
  role: string;
  name: string;
  email: string;
  initials?: string;
  is_creator?: boolean;
}

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName: string;
  onShared?: () => void;
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onShared,
}: ShareProjectDialogProps) {
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator' | 'editor' | 'viewer'>('editor');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ROLES: { value: 'admin' | 'moderator' | 'editor' | 'viewer'; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Project moderator' },
    { value: 'editor', label: 'Member (edit)' },
    { value: 'viewer', label: 'Member (view)' },
  ];
  const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? (r === 'owner' ? 'Admin' : r === 'member' ? 'Member (edit)' : r);

  const loadMembers = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await get<Member[]>(`/api/projects/${projectId}/members`);
      setMembers(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) loadMembers();
  }, [open, projectId]);

  const handleInvite = async () => {
    const e = email.trim();
    if (!e || !projectId) return;
    setError(null);
    setInviting(true);
    try {
      await post(`/api/projects/${projectId}/members`, { email: e, role: inviteRole });
      setEmail('');
      await loadMembers();
      onShared?.();
      toast.success(`Invite sent to ${e}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to invite';
      setError(msg);
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveAccess = async (memberId: string) => {
    if (!projectId || !window.confirm('Remove this person\'s access to the project?')) return;
    setError(null);
    setRemovingId(memberId);
    try {
      await del(`/api/projects/${projectId}/members/${memberId}`);
      await loadMembers();
      onShared?.();
      toast.success('Access removed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove access';
      setError(msg);
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md rounded-2xl shadow-xl border-0 bg-white overflow-hidden flex flex-col max-h-[90vh]"
        aria-describedby="share-dialog-description"
      >
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 px-6 pt-6 pb-4 flex-shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold text-gray-900">Share project</DialogTitle>
            <DialogDescription id="share-dialog-description" className="text-sm text-gray-600">
              {projectName || 'Project'} — invite by email. Shared users see this project in their list.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-gray-500">Select a role when inviting. Personal projects: you are Admin. Shared projects require a role for each member.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Email to invite"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white min-w-[140px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              title="Role (required)"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleInvite}
              disabled={!email.trim() || inviting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              {inviting ? 'Adding…' : 'Add'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">People with access</p>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500">No one else has access yet. Add by email above.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-3 rounded-lg bg-gray-50">
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {m.initials || (m.email || '').slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{m.name || m.email}</span>
                      {m.is_creator ? (
                        <span className="text-xs text-gray-600 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded flex-shrink-0">Admin (creator)</span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{roleLabel(m.role)}</span>
                      )}
                    </span>
                    <span className="text-gray-500 text-xs truncate max-w-[100px]" title={m.email}>{m.email}</span>
                    {!m.is_creator && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccess(m.id)}
                        disabled={removingId === m.id}
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 text-xs font-medium disabled:opacity-50"
                        title="Remove access"
                      >
                        {removingId === m.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 pt-2 border-t border-gray-100 flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
