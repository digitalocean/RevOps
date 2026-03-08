import { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, Star, Save, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import type { Initiative, Status, Priority, Category } from '../data/mockData';

const STATUS_OPTIONS: Status[] = ['Not Started', 'On Track', 'At Risk', 'In Review', 'Blocked', 'Complete'];
const PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2'];
const CATEGORY_OPTIONS: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];

interface CrewMember {
  id: string;
  name: string;
  initials?: string;
}

interface InitiativeDetailsDialogProps {
  initiative: Initiative;
  crew?: CrewMember[];
  onClose: () => void;
  onSave?: (id: string, payload: { title?: string; description?: string; status?: Status; priority?: Priority; assignee_id?: string | null; category?: Category; due_date?: string | null }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function InitiativeDetailsDialog({ initiative, crew = [], onClose, onSave, onDelete }: InitiativeDetailsDialogProps) {
  const [title, setTitle] = useState(initiative.name);
  const [description, setDescription] = useState(initiative.description || '');
  const [status, setStatus] = useState<Status>(initiative.status);
  const [priority, setPriority] = useState<Priority>(initiative.priority);
  const [assigneeId, setAssigneeId] = useState<string | null>(initiative.assignee_id ?? null);
  const [category, setCategory] = useState<Category>(initiative.category);
  const dueDateStr = initiative.endDate && !isNaN(initiative.endDate.getTime()) ? initiative.endDate.toISOString().slice(0, 10) : '';
  const [dueDate, setDueDate] = useState(dueDateStr);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dueDateForApi = dueDate ? `${dueDate}T00:00:00.000Z` : null;

  useEffect(() => {
    setTitle(initiative.name);
    setDescription(initiative.description || '');
    setStatus(initiative.status);
    setPriority(initiative.priority);
    setAssigneeId(initiative.assignee_id ?? null);
    setCategory(initiative.category);
    const d = initiative.endDate && !isNaN(initiative.endDate.getTime()) ? initiative.endDate.toISOString().slice(0, 10) : '';
    setDueDate(d);
  }, [initiative.id, initiative.name, initiative.description, initiative.status, initiative.priority, initiative.assignee_id, initiative.category, initiative.endDate]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(initiative.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assignee_id: assigneeId,
        category,
        due_date: dueDateForApi,
      });
      toast.success('Saved');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Delete this item?')) return;
    setDeleting(true);
    try {
      await onDelete(initiative.id);
      toast.success('Deleted');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = !!onSave;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-2xl shadow-xl border border-gray-200">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {initiative.isBigRock && (
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
                {canEdit ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-semibold h-auto py-1"
                    placeholder="Title"
                  />
                ) : (
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    {initiative.name}
                  </DialogTitle>
                )}
              </div>
              {canEdit ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm min-h-[60px]"
                  placeholder="Description"
                />
              ) : (
                <p className="text-sm text-gray-600">{initiative.description || '—'}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  {onDelete && (
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Progress</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Overall completion</span>
                      <span className="font-semibold text-gray-900">{initiative.progress}%</span>
                    </div>
                    <Progress value={initiative.progress} className="h-2" />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Due date</h4>
                  {canEdit ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">
                        {initiative.endDate && !isNaN(initiative.endDate.getTime())
                          ? initiative.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : 'No date set'}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Questions & Blockers</h4>
                  {initiative.questions ? (
                    <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      {initiative.questions}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No questions or blockers reported</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Status
              </label>
              {canEdit ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge className={`${initiative.status === 'On Track' ? 'bg-green-500' : initiative.status === 'At Risk' ? 'bg-yellow-500' : initiative.status === 'Blocked' ? 'bg-red-500' : initiative.status === 'Complete' ? 'bg-blue-500' : 'bg-gray-300'} text-white border-0 text-sm`}>
                  {initiative.status}
                </Badge>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Owner
              </label>
              {canEdit ? (
                <Select value={assigneeId ?? 'unassigned'} onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Unassigned</SelectItem>
                    {crew.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                    {(initiative.owner || '—').split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2) || '—'}
                  </div>
                  <span className="text-sm text-gray-900">{initiative.owner || 'Unassigned'}</span>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Priority
              </label>
              {canEdit ? (
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={`${initiative.priority === 'P0' ? 'bg-red-100 text-red-700 border-red-200' : initiative.priority === 'P1' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'} text-sm`}>
                  {initiative.priority}
                </Badge>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Category
              </label>
              {canEdit ? (
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={`${initiative.category === 'Engineering' ? 'bg-purple-50 text-purple-700 border-purple-200' : initiative.category === 'Design' ? 'bg-pink-50 text-pink-700 border-pink-200' : initiative.category === 'Sales' ? 'bg-green-50 text-green-700 border-green-200' : initiative.category === 'Product' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'} text-sm`}>
                  {initiative.category}
                </Badge>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Big Rock
              </label>
              <Badge className={`${initiative.isBigRock ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'} border-0 text-sm`}>
                {initiative.isBigRock ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
