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
import { get, post, del, patch } from '../api/meridian';

interface Member {
  id: string | null;
  crew_id: string | null;
  role: string;
  name: string;
  email: string;
  initials?: string;
  first_name?: string | null;
  last_name?: string | null;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator' | 'editor' | 'viewer'>('editor');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'moderator' | 'editor' | 'viewer'>('editor');
  const [savingEdit, setSavingEdit] = useState(false);

  const ROLES: { value: 'admin' | 'moderator' | 'editor' | 'viewer'; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Project moderator' },
    { value: 'editor', label: 'Member (edit)' },
    { value: 'viewer', label: 'Member (view)' },
  ];
  const roleLabel = (r: string) =>
    ROLES.find((x) => x.value === r)?.label ?? (r === 'owner' ? 'Admin' : r === 'member' ? 'Member (edit)' : r);

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
    if (open && projectId) {
      loadMembers();
      setFirstName('');
      setLastName('');
      setEmail('');
      setEditingId(null);
    }
  }, [open, projectId]);

  const inviteValid =
    firstName.trim().length > 0 && lastName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleInvite = async () => {
    if (!inviteValid || !projectId) {
      setError('First name, last name, and a valid email are required.');
      return;
    }
    setError(null);
    setInviting(true);
    try {
      await post(`/api/projects/${projectId}/members`, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: inviteRole,
      });
      setFirstName('');
      setLastName('');
      setEmail('');
      await loadMembers();
      onShared?.();
      toast.success(`Added ${firstName.trim()} ${lastName.trim()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to invite';
      setError(msg);
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const startEdit = (m: Member) => {
    if (!m.id) return;
    setEditingId(m.id);
    setEditFirst((m.first_name || '').trim() || m.name.split(/\s+/)[0] || '');
    setEditLast(
      (m.last_name || '').trim() ||
        (m.name.includes(' ') ? m.name.split(/\s+/).slice(1).join(' ') : '')
    );
    setEditEmail(m.email || '');
    const r = m.role as typeof editRole;
    setEditRole(ROLES.some((x) => x.value === r) ? r : 'editor');
  };

  const saveEdit = async () => {
    if (!projectId || !editingId) return;
    const ef = editFirst.trim();
    const el = editLast.trim();
    const em = editEmail.trim().toLowerCase();
    if (!ef || !el || !em) {
      toast.error('First name, last name, and email are required.');
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await patch(`/api/projects/${projectId}/members/${editingId}`, {
        first_name: ef,
        last_name: el,
        email: em,
        role: editRole,
      });
      setEditingId(null);
      await loadMembers();
      onShared?.();
      toast.success('Member updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
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

  const memberKey = (m: Member, idx: number) =>
    m.id ?? `creator-${m.email ?? idx}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg rounded-2xl shadow-xl border-0 bg-white overflow-hidden flex flex-col max-h-[90vh]"
        aria-describedby="share-dialog-description"
      >
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 px-6 pt-6 pb-4 flex-shrink-0">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold text-gray-900">Share project</DialogTitle>
            <DialogDescription id="share-dialog-description" className="text-sm text-gray-600">
              {projectName || 'Project'} — add people with first name, last name, and email. They will see this project in
              their list.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-gray-500">
            All fields are required when inviting. You can edit names, email, and role for anyone in the list below
            (except the project creator).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              type="text"
              placeholder="First name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Input
              type="text"
              placeholder="Last name *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <Input
              type="email"
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:col-span-1"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white min-w-[160px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              title="Role"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleInvite}
              disabled={!inviteValid || inviting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0"
            >
              {inviting ? 'Adding…' : 'Add to project'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">People with access</p>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-500">No one else has access yet. Add someone above.</p>
            ) : (
              <ul className="space-y-2 max-h-[min(50vh,320px)] overflow-y-auto pr-1">
                {members.map((m, idx) => (
                  <li
                    key={memberKey(m, idx)}
                    className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 text-sm"
                  >
                    {editingId === m.id && m.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="First name"
                            value={editFirst}
                            onChange={(e) => setEditFirst(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Input
                            placeholder="Last name"
                            value={editLast}
                            onChange={(e) => setEditLast(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Input
                          type="email"
                          placeholder="Email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as typeof editRole)}
                            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={saveEdit}
                            disabled={savingEdit}
                          >
                            {savingEdit ? 'Saving…' : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {m.initials || (m.email || '').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="font-medium text-gray-900 block truncate">{m.name || m.email}</span>
                            <span className="text-xs text-gray-500 truncate block">{m.email}</span>
                          </span>
                          {m.is_creator ? (
                            <span className="text-xs text-gray-600 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded flex-shrink-0">
                              Admin (creator)
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              {roleLabel(m.role)}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          {m.id && !m.is_creator && (
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded px-2 py-1 text-xs font-medium"
                            >
                              Edit
                            </button>
                          )}
                          {!m.is_creator && m.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAccess(m.id!)}
                              disabled={removingId === m.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 text-xs font-medium disabled:opacity-50"
                              title="Remove access"
                            >
                              {removingId === m.id ? '…' : 'Remove'}
                            </button>
                          )}
                        </span>
                      </div>
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
