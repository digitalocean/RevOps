import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Check, Loader2, FileText, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV } from './SpreadsheetImport';
import { Button } from './ui/button';
import { get, post, patch } from '../api/meridian';

interface SavedTemplate {
  id: string;
  name: string;
  trackers?: { name: string; tasks?: { title: string; status?: string; priority?: string }[] }[];
}

const STANDARD_COLUMNS = new Set(['title', 'task', 'name', 'description', 'desc', 'status', 'priority', 'category', 'due', 'due_date', 'owner', 'assignee', 'section', 'tracker', 'group']);
function isStandardColumn(header: string): boolean {
  const lower = header.toLowerCase().trim();
  if (STANDARD_COLUMNS.has(lower)) return true;
  if (['title', 'task', 'initiative', 'item', 'name'].some((k) => lower.includes(k))) return true;
  if (['desc', 'description', 'notes', 'status', 'state', 'priority', 'category', 'due', 'owner', 'section', 'tracker'].some((k) => lower.includes(k))) return true;
  return false;
}

/** Column index to use as task title (Initiative). Prefer standard title-like headers, then first column. */
function getTitleColumnIndex(headers: string[]): number {
  const standardTitle = headers.findIndex((h) =>
    /^(title|task|name|item|initiative)$/i.test((h || '').trim())
  );
  if (standardTitle >= 0) return standardTitle;
  const divisionTeam = headers.findIndex((h) => {
    const lower = (h || '').toLowerCase();
    return /division|functional\s*team|^team\b|organization|group\s*name/.test(lower);
  });
  if (divisionTeam >= 0) return divisionTeam;
  return 0;
}

interface ImportTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  /** Create a new section and return its tracker id. If columns is set, only those columns are shown in this section. */
  onCreateSection: (projectId: string, sectionName: string, columns?: string[]) => Promise<string | null>;
  /** Create a task and return the created item (with id) */
  onCreateTask: (payload: Record<string, unknown>, trackerId?: string | null) => Promise<{ id?: string } | null>;
  onSuccess: () => void;
}

export function ImportTemplateDialog({
  open,
  onClose,
  projectId,
  onCreateSection,
  onCreateTask,
  onSuccess,
}: ImportTemplateDialogProps) {
  const [step, setStep] = useState<'choose' | 'upload' | 'preview' | 'template_preview'>('choose');
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [rawText, setRawText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [sectionName, setSectionName] = useState('Imported');
  const [templateName, setTemplateName] = useState('');
  const [importing, setImporting] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep('choose');
    setSelectedTemplate(null);
    setTemplatesLoading(true);
    get<SavedTemplate[]>('/api/templates')
      .then((list) => setSavedTemplates(Array.isArray(list) ? list : []))
      .catch(() => setSavedTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [open]);

  const processInput = () => {
    const parsed = parseCSV(rawText);
    if (parsed.length < 2) {
      toast.error('Need at least a header row and one data row');
      return;
    }
    const hdrs = parsed[0].map((h) => (h || '').trim() || `Column ${parsed[0].indexOf(h) + 1}`);
    const dataRows = parsed.slice(1);
    const titleColIdx = getTitleColumnIndex(hdrs);
    const customNames = hdrs.filter((h, i) => !isStandardColumn(h) && i !== titleColIdx);
    setHeaders(hdrs);
    setRows(dataRows);
    setCustomFieldNames(customNames);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!projectId || !headers.length) return;
    setImporting(true);
    try {
      const firstCol = getTitleColumnIndex(headers);
      const descIdx = headers.findIndex((h) => /description|^desc$/i.test((h || '').trim()));
      const createdFieldIds: Record<string, string> = {};
      for (const name of customFieldNames) {
        try {
          const field = await post<{ id: string }>('/api/custom-fields', {
            project_id: projectId,
            name: name.trim(),
            target: 'item',
            field_type: 'text',
          });
          if (field?.id) createdFieldIds[name] = field.id;
        } catch (err) {
          toast.error(`Could not create field "${name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
          throw err;
        }
      }
      const sectionColumns = Object.keys(createdFieldIds).length > 0 ? ['name', ...Object.values(createdFieldIds)] : undefined;
      const newTrackerId = await onCreateSection(projectId, (sectionName || 'Imported').trim(), sectionColumns);
      if (!newTrackerId) {
        toast.error('Could not create section for import');
        setImporting(false);
        return;
      }
      let taskCount = 0;
      for (const row of rows) {
        const title = (row[firstCol] ?? row[0] ?? '').trim();
        if (!title) continue;
        const payload: Record<string, unknown> = {
          title,
          description: (descIdx >= 0 ? (row[descIdx] ?? '').trim() : (row[1] ?? '').trim()) || undefined,
          status: 'not_started',
          priority: 'medium',
        };
        const item = await onCreateTask(payload, newTrackerId);
        const taskId = item && typeof item === 'object' && 'id' in item ? String((item as { id?: string }).id) : null;
        if (taskId && Object.keys(createdFieldIds).length > 0) {
          const values = customFieldNames
            .map((name) => {
              const idx = headers.indexOf(name);
              if (idx < 0) return null;
              const val = (row[idx] ?? '').trim();
              if (!val) return null;
              return { fieldId: createdFieldIds[name], valueText: val };
            })
            .filter(Boolean) as { fieldId: string; valueText: string }[];
          if (values.length) {
            try {
              await patch(`/api/tasks/${taskId}/field-values`, { values });
            } catch (err) {
              toast.error(`Could not save custom values for task "${title}"`);
            }
          }
        }
        taskCount += 1;
      }
      toast.success(`Created section "${sectionName || 'Imported'}", ${customFieldNames.length} custom field(s), and ${taskCount} task(s)`);
      onSuccess();
      onClose();
      setRawText('');
      setStep('choose');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!projectId || !selectedTemplate?.id) return;
    setApplying(true);
    try {
      await post(`/api/projects/${projectId}/apply-template`, { template_id: selectedTemplate.id });
      toast.success(`Template "${selectedTemplate.name}" applied.`);
      onSuccess();
      onClose();
      setStep('choose');
      setSelectedTemplate(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = (templateName || 'Import template').trim();
    if (!name) { toast.error('Enter a template name'); return; }
    setSavingTemplate(true);
    try {
      const firstCol = getTitleColumnIndex(headers);
      const tasks = rows
        .map((row) => (row[firstCol] ?? row[0] ?? '').trim())
        .filter(Boolean)
        .map((title) => ({ title, status: 'Not Started', priority: 'P1' }));
      await post('/api/templates', {
        name,
        trackers: [{ name: sectionName || 'Imported', tasks }],
      });
      toast.success(`Template "${name}" saved. You can select it next time you use Import from template.`);
      setTemplateName('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Import template</h2>
              <p className="text-xs text-gray-500">Column names → custom fields. Rows → tasks.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'choose' && (
            <>
              <p className="text-sm text-gray-600 mb-4">Use a saved template or import from a new file.</p>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading templates…
                </div>
              ) : (
                <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {savedTemplates.length === 0 && (
                    <li className="text-sm text-gray-500 py-2">No saved templates yet. Use &quot;Import new&quot; and then save as template.</li>
                  )}
                  {savedTemplates.map((t) => {
                    const sectionCount = t.trackers?.length ?? 0;
                    const taskCount = (t.trackers ?? []).reduce((sum, tr) => sum + (tr.tasks?.length ?? 0), 0);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedTemplate(t); setStep('template_preview'); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-left hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                          <span className="flex-1 font-medium text-gray-900 truncate">{t.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {sectionCount} section{sectionCount !== 1 ? 's' : ''}, {taskCount} task{taskCount !== 1 ? 's' : ''}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setStep('upload')}
              >
                <PlusCircle className="w-4 h-4" /> Import new (upload or paste CSV)
              </Button>
            </>
          )}

          {step === 'template_preview' && selectedTemplate && (
            <>
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedTemplate.name}</strong>
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Applying this template will create only the sections (and table headers). No task rows will be added.
              </p>
              <ul className="text-sm text-gray-600 mb-4 list-disc list-inside">
                {(selectedTemplate.trackers ?? []).map((tr, i) => (
                  <li key={i}>Section &quot;{tr.name}&quot;</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('choose'); setSelectedTemplate(null); }}>
                  Back
                </Button>
                <Button onClick={handleApplyTemplate} disabled={applying || !projectId}>
                  {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Apply to project
                </Button>
              </div>
            </>
          )}

          {step === 'upload' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setRawText(String(reader.result ?? ''));
                  if (f.name.endsWith('.xlsx')) {
                    toast.error('Please save as CSV or paste Excel data');
                    return;
                  }
                  reader.readAsText(f);
                }}
              />
              <Button type="button" variant="outline" className="w-full gap-2 mb-4" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" /> Upload CSV / TSV
              </Button>
              <p className="text-xs text-gray-500 mb-2">Or paste from Excel (first row = column headers):</p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Title,Description,Status,My Custom Column&#10;Task 1,Desc here,Open,Value 1&#10;Task 2,Another,Done,Value 2"
                rows={8}
                className="w-full text-sm font-mono border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep('choose')}>Back</Button>
                <Button className="flex-1" onClick={processInput} disabled={!rawText.trim()}>
                  Preview
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Task title (Initiative):</strong> &quot;{headers[getTitleColumnIndex(headers)]}&quot;
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Custom fields to create:</strong> {customFieldNames.length ? customFieldNames.join(', ') : 'None (title column only).'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Tasks to create:</strong> {rows.filter((r) => (r[getTitleColumnIndex(headers)] ?? r[0])?.trim()).length} rows in a <strong>new section</strong>.
              </p>
              <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">New section name</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="Imported"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4"
              />
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" onClick={() => { setStep('upload'); setHeaders([]); setRows([]); setCustomFieldNames([]); setSectionName('Imported'); }}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing || !projectId}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Import (new section)
                </Button>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Save as template (optional)</label>
                <p className="text-xs text-gray-500 mb-2">Name this import so you can select it next time.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Bandwidth-billing cases"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
                  />
                  <Button variant="outline" onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
                    {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save template'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
