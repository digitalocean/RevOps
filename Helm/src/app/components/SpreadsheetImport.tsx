import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface ImportRow {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  due_date?: string;
  owner?: string;
  /** When present, row belongs to this section (tracker) */
  section?: string;
}

export interface ImportSections {
  sections: Array<{ name: string; tasks: ImportRow[] }>;
}

interface SpreadsheetImportProps {
  projectId: string | null;
  /** Called with flat rows, or with sections when a Section column is detected */
  onImport: (data: { rows?: ImportRow[]; sections?: Array<{ name: string; tasks: ImportRow[] }> }) => Promise<void>;
  onClose: () => void;
}

const STATUS_MAP: Record<string, string> = {
  'not started': 'not_started', 'todo': 'not_started', 'to do': 'not_started', 'open': 'not_started',
  'in progress': 'in_progress', 'wip': 'in_progress', 'in review': 'in_review', 'review': 'in_review',
  'on track': 'on_track', 'done': 'complete', 'complete': 'complete', 'completed': 'complete',
  'closed': 'complete', 'blocked': 'blocked', 'at risk': 'at_risk',
};

const PRIORITY_MAP: Record<string, string> = {
  'p0': 'critical', 'critical': 'critical', 'high': 'high', 'p1': 'high',
  'medium': 'medium', 'med': 'medium', 'p2': 'medium', 'low': 'low', 'p3': 'low',
};

export function parseCSV(raw: string): string[][] {
  const lines = raw.trim().split(/\r?\n/);
  return lines.map(line => {
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if ((ch === ',' || ch === '\t') && !inQuote) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  });
}

export function detectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());
  // Prefer "title"/"task" for task title; use "name" only if no better match (avoids mapping "Name" when "Title" exists)
  const titleIdx = lower.findIndex((l) => ['title', 'task', 'initiative', 'item'].some((k) => l.includes(k)));
  if (titleIdx >= 0) map.title = titleIdx;
  else {
    const nameIdx = lower.findIndex((l) => l.includes('name'));
    if (nameIdx >= 0) map.title = nameIdx;
  }
  lower.forEach((l, i) => {
    if (map.title === i) return;
    if (['section', 'tracker', 'group', 'sprint'].some((k) => l === k || l.includes(k))) {
      if (map.section === undefined) map.section = i;
    }
    if (['desc', 'description', 'notes', 'details', 'summary'].some((k) => l.includes(k))) map.description = i;
    else if (['status', 'state'].some((k) => l.includes(k))) map.status = i;
    else if (['priority', 'prio', 'urgency'].some((k) => l.includes(k))) map.priority = i;
    else if (['category', 'type', 'area', 'team', 'dept'].some((k) => l.includes(k))) {
      if (map.category === undefined) map.category = i;
    }
    else if (['due', 'deadline', 'date', 'target'].some((k) => l.includes(k))) map.due_date = i;
    else if (['owner', 'assignee', 'assigned', 'responsible'].some((k) => l.includes(k))) map.owner = i;
  });
  return map;
}

function mapRow(row: string[], colMap: Record<string, number>): ImportRow | null {
  const title = colMap.title !== undefined ? row[colMap.title] : row[0];
  if (!title?.trim()) return null;
  const raw: ImportRow = { title: title.trim() };
  if (colMap.description !== undefined) raw.description = row[colMap.description];
  if (colMap.status !== undefined) {
    const s = (row[colMap.status] || '').toLowerCase().trim();
    raw.status = STATUS_MAP[s] || undefined;
  }
  if (colMap.priority !== undefined) {
    const p = (row[colMap.priority] || '').toLowerCase().trim();
    raw.priority = PRIORITY_MAP[p] || undefined;
  }
  if (colMap.category !== undefined) raw.category = row[colMap.category]?.trim();
  if (colMap.due_date !== undefined) {
    const d = row[colMap.due_date]?.trim();
    if (d) {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) raw.due_date = parsed.toISOString().slice(0, 10);
    }
  }
  if (colMap.owner !== undefined) raw.owner = row[colMap.owner]?.trim();
  if (colMap.section !== undefined) raw.section = row[colMap.section]?.trim() || undefined;
  return raw;
}

export function SpreadsheetImport({ projectId, onImport, onClose }: SpreadsheetImportProps) {
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'paste' | 'preview' | 'importing'>('paste');
  const [importing, setImporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const processRaw = useCallback((raw: string) => {
    const rows = parseCSV(raw);
    if (rows.length < 2) { toast.error('Need at least a header row and one data row'); return; }
    const hdrs = rows[0];
    const detected = detectColumns(hdrs);
    setHeaders(hdrs);
    setColMap(detected);
    const mapped = rows.slice(1).map((r) => mapRow(r, detected)).filter(Boolean) as ImportRow[];
    if (!mapped.length) { toast.error('No rows with titles found'); return; }
    setPreview(mapped);
    setStep('preview');
  }, []);

  // When user changes column mapping in preview, re-apply mapping so preview rows match
  useEffect(() => {
    if (step !== 'preview' || !pasteText.trim() || Object.keys(colMap).length === 0) return;
    const rows = parseCSV(pasteText);
    if (rows.length < 2) return;
    const mapped = rows.slice(1).map((r) => mapRow(r, colMap)).filter(Boolean) as ImportRow[];
    setPreview(mapped);
  }, [step, colMap, pasteText]);

  const handlePaste = () => processRaw(pasteText);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) processRaw(e.target.result as string); };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!projectId || !preview.length) return;
    setImporting(true);
    try {
      const useSections = colMap.section !== undefined && preview.some((r) => r.section?.trim());
      if (useSections) {
        const sectionNames = [...new Set(preview.map((r) => (r.section?.trim() || 'Tasks')))];
        const sections = sectionNames.map((name) => ({
          name,
          tasks: preview.filter((r) => (r.section?.trim() || 'Tasks') === name),
        }));
        await onImport({ sections });
        const total = sections.reduce((acc, s) => acc + s.tasks.length, 0);
        toast.success(`Imported ${sections.length} sections, ${total} tasks`);
      } else {
        await onImport({ rows: preview });
        toast.success(`Imported ${preview.length} tasks`);
      }
      onClose();
    } catch { toast.error('Import failed'); }
    finally { setImporting(false); }
  };

  const CATEGORY_OPTIONS = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Import from Spreadsheet</h2>
              <p className="text-xs text-gray-500">CSV, TSV, or paste from Google Sheets / Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'paste' && (
            <div className="p-6 space-y-5">
              {/* Drag & drop file zone */}
              <div
                ref={dragRef}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'}`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${dragging ? 'text-indigo-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700">Drop a CSV file here</p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              <div className="flex items-center gap-3 text-gray-400 text-xs">
                <div className="flex-1 h-px bg-gray-200" />
                <span>or paste directly</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Paste area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Paste from Google Sheets / Excel</label>
                  <span className="text-xs text-gray-400">First row = column headers</span>
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`Title\tStatus\tPriority\tOwner\nDeal Desk Automation\tOn Track\tP1\tRaj\nQ3 Revenue Review\tNot Started\tP2\t`}
                  rows={7}
                  className="w-full font-mono text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 text-gray-800 placeholder-gray-300"
                />
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-gray-500">Select all cells in Google Sheets (Ctrl+A) then copy and paste here</p>
                </div>
              </div>

              <button
                onClick={handlePaste}
                disabled={!pasteText.trim()}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Preview Import
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="p-6 space-y-5">
              {/* Column mapping */}
              <div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3">
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Column mapping {showAdvanced ? '(hide)' : '(show)'}
                </button>
                {showAdvanced && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Map your columns</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['title', 'section', 'description', 'status', 'priority', 'category', 'due_date', 'owner'] as const).map(field => (
                        <div key={field} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-20 capitalize">{field.replace('_', ' ')}</span>
                          <select
                            value={colMap[field] ?? ''}
                            onChange={e => {
                              const v = e.target.value;
                              setColMap(prev => {
                                const n = { ...prev };
                                if (v === '') delete n[field];
                                else n[field] = Number(v);
                                return n;
                              });
                            }}
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-indigo-400"
                          >
                            <option value="">— none —</option>
                            {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => {
                      const rows = parseCSV(pasteText);
                      if (rows.length >= 2) {
                        const mapped = rows.slice(1).map(r => mapRow(r, colMap)).filter(Boolean) as ImportRow[];
                        setPreview(mapped);
                      }
                    }} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 hover:border-gray-300 transition-colors">
                      Re-apply mapping
                    </button>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-800">{preview.length} tasks ready to import</span>
                  <button onClick={() => setStep('paste')} className="text-xs text-gray-500 hover:text-gray-700 underline">
                    ← Change data
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-y-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Title</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Priority</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-600">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate">{row.title}</td>
                            <td className="px-3 py-2 text-gray-500">{row.status || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.priority || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{row.category || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            Cancel
          </button>
          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={importing || !preview.length}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {importing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
              ) : (
                <><Check className="w-4 h-4" /> Import {preview.length} tasks</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ImportRow };
