import { useState, useEffect, useRef } from 'react';
import { Layers, ChevronRight, X, Check, Loader2, Sparkles, Upload } from 'lucide-react';
import { get, post } from '../api/meridian';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { parseCSV, detectColumns } from './SpreadsheetImport';

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  trackers: Array<{ name: string; tasks: Array<{ title: string; priority?: string; status?: string }> }>;
}

type UploadTrackers = Array<{ name: string; tasks: Array<{ title: string; priority?: string; status?: string }> }>;

interface ProjectTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName?: string;
  onApplied: () => void;
  /** When user uploads a sheet and clicks Apply, create sections + tasks from parsed data */
  onApplyWithData?: (trackers: UploadTrackers) => Promise<void>;
}

function buildTrackersFromSheet(raw: string): UploadTrackers | null {
  const rows = parseCSV(raw);
  if (rows.length < 2) return null;
  const headers = rows[0];
  const detected = detectColumns(headers);
  const titleIdx = detected.title ?? 0;
  const sectionIdx = detected.section;
  const priorityIdx = detected.priority;
  const statusIdx = detected.status;
  const tasks: { section: string; title: string; priority?: string; status?: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[titleIdx] ?? '').trim();
    if (!title) continue;
    const section = sectionIdx !== undefined ? (row[sectionIdx] ?? '').trim() || 'Tasks' : 'Tasks';
    const priority = priorityIdx !== undefined ? row[priorityIdx]?.trim() : undefined;
    const status = statusIdx !== undefined ? row[statusIdx]?.trim() : undefined;
    tasks.push({ section, title, priority, status });
  }
  const bySection = new Map<string, { title: string; priority?: string; status?: string }[]>();
  for (const t of tasks) {
    const list = bySection.get(t.section) ?? [];
    list.push({ title: t.title, priority: t.priority, status: t.status });
    bySection.set(t.section, list);
  }
  return Array.from(bySection.entries()).map(([name, list]) => ({ name, tasks: list }));
}

export function ProjectTemplatesDialog({ open, onClose, projectId, projectName, onApplied, onApplyWithData }: ProjectTemplatesDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);
  const [tab, setTab] = useState<'list' | 'upload'>('list');
  const [uploadText, setUploadText] = useState('');
  const [parsedTrackers, setParsedTrackers] = useState<UploadTrackers | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handlePreviewUpload = () => {
    const trackers = buildTrackersFromSheet(uploadText);
    if (!trackers?.length) {
      toast.error('Need at least a header row and one data row. Use a "Section" or "Title" column.');
      return;
    }
    setParsedTrackers(trackers);
  };

  const handleApplyUpload = async () => {
    if (!parsedTrackers?.length || !projectId || !onApplyWithData) return;
    setApplying(true);
    try {
      await onApplyWithData(parsedTrackers);
      toast.success('Sections and tasks created from sheet.');
      onApplied();
      setParsedTrackers(null);
      setUploadText('');
      setTab('list');
      onClose();
    } catch (e) {
      toast.error('Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!parsedTrackers?.length || !saveTemplateName.trim()) {
      toast.error('Enter a template name');
      return;
    }
    setSavingTemplate(true);
    try {
      await post('/api/templates', { name: saveTemplateName.trim(), trackers: parsedTrackers });
      toast.success('Template saved.');
      setSaveTemplateName('');
      setTemplates(prev => [...prev, { id: '', name: saveTemplateName.trim(), description: null, icon: '📋', trackers: parsedTrackers }]);
    } catch (e) {
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[720px] max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Templates</h2>
              {projectName && <p className="text-xs text-gray-500">Apply to: {projectName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            type="button"
            onClick={() => { setTab('list'); setParsedTrackers(null); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${tab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Use a template
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${tab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Upload sheet
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {tab === 'list' && (
            <>
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
                      {(selected.trackers || []).map((tracker, ti) => (
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
            </>
          )}

          {tab === 'upload' && (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <p className="text-sm text-gray-600">Paste CSV/TSV or upload a file. Use a <strong>Section</strong> (or Tracker) column to create multiple sections; first column can be title.</p>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = () => setUploadText(String(r.result ?? ''));
                      r.readAsText(f);
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" /> Upload file
                </Button>
              </div>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste sheet data here...&#10;Section	Title	Priority	Status&#10;Backlog	Task one	P1	Not Started&#10;Backlog	Task two	P2	In Progress"
                rows={6}
                className="w-full text-sm font-mono border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePreviewUpload} disabled={!uploadText.trim()}>
                  Detect sections & preview
                </Button>
                {parsedTrackers && (
                  <Button size="sm" variant="outline" onClick={() => { setParsedTrackers(null); setUploadText(''); }}>
                    Clear
                  </Button>
                )}
              </div>

              {parsedTrackers && parsedTrackers.length > 0 && (
                <>
                  <div className="space-y-3">
                    {parsedTrackers.map((tracker, ti) => (
                      <div key={ti} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                          <Layers className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700">{tracker.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{tracker.tasks?.length || 0} tasks</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-32 overflow-y-auto">
                          {(tracker.tasks || []).map((task, idx) => (
                            <div key={idx} className="px-4 py-2 flex items-center gap-3">
                              <span className="text-sm text-gray-700 flex-1 truncate">{task.title}</span>
                              {task.priority && <span className="text-xs text-gray-500">{task.priority}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-4 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 uppercase">Save as template</span>
                    <Input
                      placeholder="Template name"
                      value={saveTemplateName}
                      onChange={(e) => setSaveTemplateName(e.target.value)}
                      className="w-40 h-9 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleSaveAsTemplate} disabled={!saveTemplateName.trim() || savingTemplate}>
                      {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save template
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            {tab === 'upload' && parsedTrackers?.length ? 'Apply to create sections and tasks, or save as template for later.' : 'Apply adds trackers and tasks to your project.'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            {tab === 'list' && (
              <Button size="sm" onClick={handleApply} disabled={!selected || !projectId || applying}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply template
              </Button>
            )}
            {tab === 'upload' && parsedTrackers?.length && onApplyWithData && (
              <Button size="sm" onClick={handleApplyUpload} disabled={!projectId || applying}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply to project
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
