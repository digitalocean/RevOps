import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV } from './SpreadsheetImport';
import { Button } from './ui/button';
import { post, patch } from '../api/meridian';

const STANDARD_COLUMNS = new Set(['title', 'task', 'name', 'description', 'desc', 'status', 'priority', 'category', 'due', 'due_date', 'owner', 'assignee', 'section', 'tracker', 'group']);
function isStandardColumn(header: string): boolean {
  const lower = header.toLowerCase().trim();
  if (STANDARD_COLUMNS.has(lower)) return true;
  if (['title', 'task', 'initiative', 'item', 'name'].some((k) => lower.includes(k))) return true;
  if (['desc', 'description', 'notes', 'status', 'state', 'priority', 'category', 'due', 'owner', 'section', 'tracker'].some((k) => lower.includes(k))) return true;
  return false;
}

interface ImportTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  trackerId: string | null;
  /** Create a task and return the created item (with id) */
  onCreateTask: (payload: Record<string, unknown>, trackerId?: string | null) => Promise<{ id?: string } | null>;
  onSuccess: () => void;
}

export function ImportTemplateDialog({
  open,
  onClose,
  projectId,
  trackerId,
  onCreateTask,
  onSuccess,
}: ImportTemplateDialogProps) {
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processInput = () => {
    const parsed = parseCSV(rawText);
    if (parsed.length < 2) {
      toast.error('Need at least a header row and one data row');
      return;
    }
    const hdrs = parsed[0].map((h) => (h || '').trim() || `Column ${parsed[0].indexOf(h) + 1}`);
    const dataRows = parsed.slice(1);
    const customNames = hdrs.filter((h) => !isStandardColumn(h));
    setHeaders(hdrs);
    setRows(dataRows);
    setCustomFieldNames(customNames);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!projectId || !headers.length) return;
    setImporting(true);
    try {
      const titleIdx = headers.findIndex((h) => /title|task|name|item|initiative/i.test(h));
      const firstCol = titleIdx >= 0 ? titleIdx : 0;
      const createdFieldIds: Record<string, string> = {};
      for (const name of customFieldNames) {
        const field = await post<{ id: string }>('/api/custom-fields', {
          project_id: projectId,
          name: name.trim(),
          target: 'item',
          field_type: 'text',
        });
        if (field?.id) createdFieldIds[name] = field.id;
      }
      let taskCount = 0;
      for (const row of rows) {
        const title = (row[firstCol] ?? row[0] ?? '').trim();
        if (!title) continue;
        const payload: Record<string, unknown> = {
          title,
          description: (row[headers.findIndex((h) => /description|desc/i.test(h))] ?? row[1] ?? '').trim() || undefined,
          status: 'not_started',
          priority: 'medium',
        };
        const item = await onCreateTask(payload, trackerId);
        const taskId = item?.id;
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
          if (values.length) await patch(`/api/tasks/${taskId}/field-values`, { values });
        }
        taskCount += 1;
      }
      toast.success(`Created ${customFieldNames.length} custom fields and ${taskCount} tasks`);
      onSuccess();
      onClose();
      setRawText('');
      setStep('upload');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
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
              <Button className="w-full mt-4" onClick={processInput} disabled={!rawText.trim()}>
                Preview
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Custom fields to create:</strong> {customFieldNames.length ? customFieldNames.join(', ') : 'None (all columns are standard).'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Tasks to create:</strong> {rows.filter((r) => (r[headers[0]] ?? r[0])?.trim()).length} rows
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('upload'); setHeaders([]); setRows([]); setCustomFieldNames([]); }}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing || !projectId}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Import template
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
