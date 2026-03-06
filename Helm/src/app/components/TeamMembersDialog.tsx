import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { get, post } from '../api/meridian';

function apiPath(p: string) {
  return p.startsWith('/') ? p : `/${p}`;
}

export interface CrewMember {
  id: string;
  name: string;
  email?: string;
  initials: string;
  role?: string;
  workspace_id?: string;
}

interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  onAdded?: () => void;
}

export function TeamMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  onAdded,
}: TeamMembersDialogProps) {
  const [list, setList] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('');
  const [role, setRole] = useState('Member');

  const load = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await get<CrewMember[]>(apiPath('api/crew')).catch(() => []);
      setList(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleAdd = async () => {
    const n = name.trim();
    const i = initials.trim().slice(0, 4) || n.slice(0, 2).toUpperCase();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    if (!workspaceId) {
      toast.error('Select a workspace first');
      return;
    }
    setAdding(true);
    try {
      await post(apiPath('api/crew'), {
        workspace_id: workspaceId,
        name: n,
        email: email.trim() || undefined,
        initials: i,
        role: role || 'Member',
      });
      toast.success('Team member added');
      setName('');
      setEmail('');
      setInitials('');
      load();
      onAdded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold text-gray-900">Team members</DialogTitle>
          <p className="text-sm text-gray-500">Add and manage crew in this workspace.</p>
        </DialogHeader>
        {!workspaceId && (
          <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
            Select a workspace in the sidebar first.
          </p>
        )}
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Add member</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!workspaceId}
              />
              <Input
                placeholder="Initials (e.g. JD)"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                disabled={!workspaceId}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Email (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!workspaceId}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                disabled={!workspaceId}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!workspaceId || !name.trim() || adding}
            >
              {adding ? 'Adding…' : 'Add member'}
            </Button>
          </div>
          <div>
            <Label className="mb-2 block">Current members</Label>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-gray-500">No members yet. Add one above.</p>
            ) : (
              <ul className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {list.map((m) => (
                  <li key={m.id} className="px-3 py-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-500">{m.initials} · {m.role || 'Member'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
