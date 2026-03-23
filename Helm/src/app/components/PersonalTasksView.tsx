import { useState } from 'react';
import { Calendar, ListTodo, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Initiative, Status, Priority } from '../data/mockData';

const STATUS_OPTIONS: Status[] = ['Not Started', 'On Track', 'In Review', 'Blocked', 'At Risk', 'Complete'];
const PRIORITY_OPTIONS: Priority[] = ['P0', 'P1', 'P2'];

interface PersonalTasksViewProps {
  projectId: string | null;
  projectName: string;
  tasks: Initiative[];
  onCreateTask: (payload: {
    title: string;
    description?: string;
    due_date?: string;
    status?: string;
    priority?: string;
  }) => Promise<unknown>;
  onUpdateTask: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  onDeleteTask: (id: string) => Promise<void>;
  /** When set, trash is shown only if true for that task. */
  canDeleteTask?: (task: Initiative) => boolean;
  onOpenTask?: (task: Initiative) => void;
}

export function PersonalTasksView({
  projectId,
  projectName,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  canDeleteTask,
  onOpenTask,
}: PersonalTasksViewProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<string>('Not Started');
  const [priority, setPriority] = useState<string>('P1');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !projectId) return;
    setSubmitting(true);
    try {
      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        status,
        priority,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setStatus('Not Started');
      setPriority('P1');
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Personal tasks are loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Personal tasks</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your private list — due date, description, status, priority. Saved to your account.
        </p>
      </div>

      {/* Add task form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add task
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-gray-500">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="mt-1 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-gray-500">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="mt-1 rounded-lg"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500">Due date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 rounded-lg"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!title.trim() || submitting}
          className="mt-4 rounded-lg bg-indigo-600 hover:bg-indigo-700"
        >
          {submitting ? 'Adding…' : 'Add task'}
        </Button>
      </div>

      {/* Task list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {projectName} — {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 py-6">No tasks yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenTask?.(task)}
                    className="text-left font-medium text-gray-900 truncate block w-full hover:text-indigo-600"
                  >
                    {task.name}
                  </button>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.endDate && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.endDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{task.status}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{task.priority}</span>
                  </div>
                </div>
                {(!canDeleteTask || canDeleteTask(task)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    onClick={() => { if (confirm('Delete this task?')) onDeleteTask(task.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
