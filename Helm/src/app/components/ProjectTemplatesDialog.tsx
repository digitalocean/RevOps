import { useState, useEffect } from 'react';
import { Layers, ChevronRight, X, Check, Loader2, Sparkles } from 'lucide-react';
import { get, post } from '../api/meridian';
import { toast } from 'sonner';
import { Button } from './ui/button';

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  trackers: Array<{ name: string; tasks: Array<{ title: string; priority?: string }> }>;
}

interface ProjectTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName?: string;
  onApplied: () => void;
}

export function ProjectTemplatesDialog({ open, onClose, projectId, projectName, onApplied }: ProjectTemplatesDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    get<Template[]>('/api/templates')
      .then(t => { setTemplates(t || []); setSelected(t?.[0] || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleApply = async () => {
    if (!selected || !projectId) return;
    setApplying(true);
    try {
      await post(`/api/projects/${projectId}/apply-template`, { template_id: selected.id });
      toast.success(`Template "${selected.name}" applied!`);
      onApplied();
      onClose();
    } catch (e) {
      toast.error('Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[720px] max-h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Project Templates</h2>
              {projectName && <p className="text-xs text-gray-500">Apply to: {projectName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template list */}
          <div className="w-64 border-r border-gray-100 overflow-y-auto p-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                  selected?.id === t.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>}
                </div>
                {selected?.id === t.id && <ChevronRight className="w-4 h-4 flex-shrink-0 text-indigo-400" />}
              </button>
            ))}
          </div>

          {/* Template preview */}
          <div className="flex-1 overflow-y-auto p-5">
            {selected ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{selected.icon}</span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{selected.name}</h3>
                    {selected.description && <p className="text-sm text-gray-500 mt-0.5">{selected.description}</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  {selected.trackers.map((tracker, ti) => (
                    <div key={ti} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">{tracker.name}</span>
                        <span className="ml-auto text-xs text-gray-400">{tracker.tasks?.length || 0} tasks</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {(tracker.tasks || []).map((task, idx) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                            <div className="w-4 h-4 rounded border-2 border-gray-200 flex-shrink-0" />
                            <span className="text-sm text-gray-700 flex-1">{task.title}</span>
                            {task.priority && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                task.priority === 'P0' ? 'bg-red-100 text-red-700' :
                                task.priority === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>{task.priority}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Select a template to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">This will add trackers and pre-filled tasks to your project.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleApply} disabled={!selected || !projectId || applying}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Apply Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
