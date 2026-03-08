import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Link2, X, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedRow {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  due_date?: string;
  owner?: string;
}

interface ImportDialogProps {
  onClose: () => void;
  projectId: string | null;
  onImport: (rows: ParsedRow[]) => Promise<void>;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  // Parse headers — normalize common column names
  const raw = lines[0].split(/,|\t/).map(h => h.replace(/['"]/g, '').trim().toLowerCase());
  const col = (names: string[]) => {
    for (const n of names) {
      const idx = raw.findIndex(h => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const titleIdx    = col(['title', 'name', 'task', 'item', 'initiative', 'what']);
  const descIdx     = col(['desc', 'description', 'notes', 'note', 'detail']);
  const statusIdx   = col(['status', 'state', 'stage']);
  const priorityIdx = col(['priority', 'prio', 'urgency', 'importance']);
  const categoryIdx = col(['category', 'type', 'team', 'pillar', 'area', 'label']);
  const dueIdx      = col(['due', 'deadline', 'date', 'target']);
  const ownerIdx    = col(['owner', 'assignee', 'assigned', 'responsible', 'who']);

  if (titleIdx < 0) return [];

  const parseCell = (cells: string[], idx: number) => {
    if (idx < 0 || idx >= cells.length) return undefined;
    return cells[idx].replace(/^["']|["']$/g, '').trim() || undefined;
  };

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cells: string[] = [];
    let cur = ''; let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if ((ch === ',' || ch === '\t') && !inQuote) { cells.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur);

    const title = parseCell(cells, titleIdx);
    if (!title) return null;
    return {
      title,
      description: parseCell(cells, descIdx),
      status: parseCell(cells, statusIdx),
      priority: parseCell(cells, priorityIdx),
      category: parseCell(cells, categoryIdx),
      due_date: parseCell(cells, dueIdx),
      owner: parseCell(cells, ownerIdx),
    };
  }).filter(Boolean) as ParsedRow[];
}

const SAMPLE_CSV = `Title,Description,Status,Priority,Category,Due Date,Owner
Set up analytics pipeline,Connect BI tool to data warehouse,On Track,P1,Engineering,2026-04-15,Raj
Design new dashboard,Figma mockups for Q2 dashboard,Not Started,P0,Design,2026-04-01,
Update pricing page,Revise copy + add new tiers,At Risk,P1,Sales,2026-03-28,`;

export function ImportDialog({ onClose, projectId, onImport }: ImportDialogProps) {
  const [tab, setTab] = useState<'paste' | 'file' | 'sheets'>('paste');
  const [csvText, setCsvText] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    const rows = parseCSV(csvText);
    if (!rows.length) { setError('No valid rows found. Make sure your data has a "Title" column.'); return; }
    setError(null);
    setPreview(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const rows = parseCSV(text);
      if (!rows.length) setError('No valid rows. Check column headers.');
      else { setError(null); setPreview(rows); }
    };
    reader.readAsText(file);
  };

  const handleSheetsImport = async () => {
    const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) { setError('Invalid Google Sheets URL.'); return; }
    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    setLoading(true);
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Make sure the sheet is publicly accessible (Share → Anyone with link).');
      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('No rows found. Check the sheet has a Title column.');
      setError(null);
      setPreview(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview?.length || !projectId) return;
    setLoading(true);
    try {
      await onImport(preview);
      toast.success(`Imported ${preview.length} task${preview.length !== 1 ? 's' : ''} successfully`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import Tasks</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-6">
          {([['paste', '📋 Paste CSV'], ['file', '📁 Upload File'], ['sheets', '📊 Google Sheets']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setPreview(null); setError(null); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!preview ? (
            <>
              {/* Paste CSV */}
              {tab === 'paste' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Paste CSV or tab-separated data. The first row must be headers.
                    Recognized columns: <code className="bg-gray-100 px-1 rounded text-xs">Title</code>, <code className="bg-gray-100 px-1 rounded text-xs">Status</code>, <code className="bg-gray-100 px-1 rounded text-xs">Priority</code>, <code className="bg-gray-100 px-1 rounded text-xs">Category</code>, <code className="bg-gray-100 px-1 rounded text-xs">Due Date</code>, <code className="bg-gray-100 px-1 rounded text-xs">Owner</code>
                  </p>
                  <textarea
                    value={csvText}
                    onChange={e => { setCsvText(e.target.value); setPreview(null); setError(null); }}
                    placeholder={SAMPLE_CSV}
                    className="w-full h-48 font-mono text-xs border border-gray-200 rounded-xl p-3 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCsvText(SAMPLE_CSV)}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      Load sample
                    </button>
                    <button
                      onClick={handleParse}
                      disabled={!csvText.trim()}
                      className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    >
                      Parse →
                    </button>
                  </div>
                </div>
              )}

              {/* File upload */}
              {tab === 'file' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                  >
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">Click to upload a CSV or TSV file</p>
                    <p className="text-xs text-gray-400 mt-1">Export from Google Sheets → File → Download → CSV</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Google Sheets */}
              {tab === 'sheets' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-sm text-emerald-800 font-medium mb-1">📊 Import directly from Google Sheets</p>
                    <p className="text-xs text-emerald-700">The sheet must be set to "Anyone with the link can view".</p>
                  </div>
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={e => { setSheetsUrl(e.target.value); setError(null); }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                  <button
                    onClick={handleSheetsImport}
                    disabled={!sheetsUrl.trim() || loading}
                    className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Fetching…</>
                    ) : (
                      <><FileSpreadsheet className="w-4 h-4" /> Fetch & Preview</>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Preview — {preview.length} task{preview.length !== 1 ? 's' : ''} ready to import
                </h3>
                <button onClick={() => setPreview(null)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  ← Back
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Title', 'Status', 'Priority', 'Category', 'Due Date'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 uppercase tracking-wide text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate">{row.title}</td>
                        <td className="px-3 py-2 text-gray-600">{row.status || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.priority || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.category || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.due_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">
                    + {preview.length - 10} more rows…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && (
          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex justify-between items-center">
            <p className="text-xs text-gray-500">{preview.length} tasks will be added to this project</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : <Check className="w-4 h-4" />}
                Import {preview.length} Tasks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
