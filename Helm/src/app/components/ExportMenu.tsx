import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Initiative } from '../data/mockData';
import type { TrackerSection } from '../data/mockData';

const STANDARD_COLS: { id: string; label: string }[] = [
  { id: 'name', label: 'Initiative' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
  { id: 'progress', label: 'Progress' },
  { id: 'dueDate', label: 'Due Date' },
  { id: 'topic', label: 'Topic' },
];

interface CustomFieldDef {
  id: string;
  name: string;
}

interface ExportMenuProps {
  initiatives?: Initiative[];
  projectName?: string;
  /** When provided, export one Excel tab per section with section name as sheet name. */
  trackerSections?: TrackerSection[];
  visibleColumns?: Set<string>;
  customFields?: CustomFieldDef[];
}

function sheetName(s: string): string {
  const sanitized = s.replace(/[\\/*?:\[\]]/g, '').slice(0, 31);
  return sanitized || 'Sheet';
}

function rowForInitiative(
  i: Initiative,
  columnIds: string[],
  customFields: CustomFieldDef[]
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const labels = new Map(STANDARD_COLS.map((c) => [c.id, c.label]));
  customFields.forEach((f) => labels.set(f.id, f.name));

  columnIds.forEach((colId) => {
    const label = labels.get(colId) || colId;
    if (colId === 'name') out[label] = i.name || '';
    else if (colId === 'category') out[label] = i.category || '';
    else if (colId === 'priority') out[label] = i.priority || '';
    else if (colId === 'owner') out[label] = i.owner || '';
    else if (colId === 'status') out[label] = i.status || '';
    else if (colId === 'progress') out[label] = i.progress ?? 0;
    else if (colId === 'dueDate') out[label] = i.endDate ? new Date(i.endDate).toLocaleDateString() : '';
    else if (colId === 'topic') out[label] = String(i.field_values?.topic ?? '');
    else {
      const cf = customFields.find((f) => f.id === colId);
      if (cf) out[cf.name] = String(i.field_values?.[colId] ?? '');
    }
  });
  return out;
}

function toCSV(initiatives: Initiative[]): string {
  const headers = ['Title', 'Category', 'Priority', 'Owner', 'Status', 'Progress', 'Due Date', 'Topic'];
  const rows = initiatives.map((i) => [
    `"${(i.name || '').replace(/"/g, '""')}"`,
    i.category || '',
    i.priority || '',
    i.owner || '',
    i.status || '',
    `${i.progress ?? 0}%`,
    i.endDate ? new Date(i.endDate).toLocaleDateString() : '',
    String(i.field_values?.topic ?? ''),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportMenu({
  initiatives = [],
  projectName = 'Project',
  trackerSections,
  visibleColumns,
  customFields = [],
}: ExportMenuProps) {
  const safeName = (projectName || 'Project').replace(/[^a-z0-9]/gi, '_');
  const hasSections = trackerSections && trackerSections.length > 0;
  const columnIds = visibleColumns
    ? [
        ...STANDARD_COLS.filter((c) => visibleColumns.has(c.id)).map((c) => c.id),
        ...(customFields || []).filter((f) => visibleColumns.has(f.id)).map((f) => f.id),
      ]
    : STANDARD_COLS.map((c) => c.id);

  const handleExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      if (hasSections) {
        let anyData = false;
        for (const section of trackerSections!) {
          const rows = section.initiatives.map((i) =>
            rowForInitiative(i, columnIds, customFields)
          );
          anyData = anyData || rows.length > 0;
          const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
          XLSX.utils.book_append_sheet(wb, ws, sheetName(section.title));
        }
        if (!anyData && trackerSections!.every((s) => !s.initiatives.length)) {
          toast.error('No data to export');
          return;
        }
      } else {
        if (!initiatives.length) {
          toast.error('No data to export');
          return;
        }
        const data = initiatives.map((i) => rowForInitiative(i, columnIds, customFields));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      }
      XLSX.writeFile(wb, `${safeName}_${getDateStr()}.xlsx`);
      toast.success('Excel exported — one tab per section');
    } catch (e) {
      toast.error('Failed to export Excel');
    }
  };

  const handleCSV = () => {
    const list = hasSections ? trackerSections!.flatMap((s) => s.initiatives) : initiatives;
    if (!list.length) { toast.error('No data to export'); return; }
    const csv = toCSV(list);
    downloadFile(csv, `${safeName}_${getDateStr()}.csv`, 'text/csv');
    toast.success('CSV exported');
  };

  const handleJSON = () => {
    const list = hasSections ? trackerSections!.flatMap((s) => s.initiatives) : initiatives;
    if (!list.length) { toast.error('No data to export'); return; }
    const data = list.map((i) => ({
      title: i.name, category: i.category, priority: i.priority,
      owner: i.owner, status: i.status, progress: i.progress,
      dueDate: i.endDate ? new Date(i.endDate).toISOString().slice(0, 10) : null,
      topic: i.field_values?.topic,
    }));
    downloadFile(JSON.stringify(data, null, 2), `${safeName}_${getDateStr()}.json`, 'application/json');
    toast.success('JSON exported');
  };

  const handlePrint = () => {
    const list = hasSections ? trackerSections!.flatMap((s) => s.initiatives) : initiatives;
    if (!list.length) { toast.error('No data to export'); return; }
    const rows = list.map((i) =>
      `<tr>
        <td>${i.name}</td><td>${i.category}</td><td>${i.priority}</td>
        <td>${i.owner || '—'}</td><td>${i.status}</td><td>${i.progress ?? 0}%</td>
        <td>${i.endDate ? new Date(i.endDate).toLocaleDateString() : '—'}</td>
        <td>${String(i.field_values?.topic ?? '')}</td>
      </tr>`
    ).join('');
    const html = `<html><head><title>${projectName}</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}
      h1{font-size:16px;margin-bottom:12px}</style></head>
      <body><h1>${projectName} — ${getDateStr()}</h1>
      <table><thead><tr><th>Initiative</th><th>Category</th><th>Priority</th><th>Owner</th><th>Status</th><th>Progress</th><th>Due Date</th><th>Topic</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExcel}>
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Export as Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleCSV}>
          <FileText className="w-4 h-4 text-gray-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handlePrint}>
          <FileText className="w-4 h-4 text-red-600" />
          Print / PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleJSON}>
          <FileJson className="w-4 h-4 text-blue-600" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
