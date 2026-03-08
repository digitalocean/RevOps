import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Initiative } from '../data/mockData';

interface ExportMenuProps {
  initiatives?: Initiative[];
  projectName?: string;
}

function toCSV(initiatives: Initiative[]): string {
  const headers = ['Title', 'Category', 'Priority', 'Owner', 'Status', 'Progress', 'Due Date', 'Big Rock'];
  const rows = initiatives.map((i) => [
    `"${(i.name || '').replace(/"/g, '""')}"`,
    i.category || '',
    i.priority || '',
    i.owner || '',
    i.status || '',
    `${i.progress ?? 0}%`,
    i.endDate ? new Date(i.endDate).toLocaleDateString() : '',
    i.isBigRock ? 'Yes' : 'No',
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

function toExcelData(initiatives: Initiative[]): Record<string, string | number>[] {
  return initiatives.map((i) => ({
    Title: i.name || '',
    Category: i.category || '',
    Priority: i.priority || '',
    Owner: i.owner || '',
    Status: i.status || '',
    Progress: `${i.progress ?? 0}%`,
    'Due Date': i.endDate ? new Date(i.endDate).toLocaleDateString() : '',
    'Big Rock': i.isBigRock ? 'Yes' : 'No',
  }));
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportMenu({ initiatives = [], projectName = 'Project' }: ExportMenuProps) {
  const safeName = projectName.replace(/[^a-z0-9]/gi, '_');

  const handleCSV = () => {
    if (!initiatives.length) { toast.error('No data to export'); return; }
    const csv = toCSV(initiatives);
    downloadFile(csv, `${safeName}_${getDateStr()}.csv`, 'text/csv');
    toast.success('CSV exported');
  };

  const handleExcel = () => {
    if (!initiatives.length) { toast.error('No data to export'); return; }
    try {
      const data = toExcelData(initiatives);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
      XLSX.writeFile(wb, `${safeName}_${getDateStr()}.xlsx`);
      toast.success('Excel file exported');
    } catch (e) {
      toast.error('Failed to export Excel');
    }
  };

  const handleJSON = () => {
    if (!initiatives.length) { toast.error('No data to export'); return; }
    const data = initiatives.map((i) => ({
      title: i.name, category: i.category, priority: i.priority,
      owner: i.owner, status: i.status, progress: i.progress,
      dueDate: i.endDate ? new Date(i.endDate).toLocaleDateString() : null,
      isBigRock: i.isBigRock,
    }));
    downloadFile(JSON.stringify(data, null, 2), `${safeName}_${getDateStr()}.json`, 'application/json');
    toast.success('JSON exported');
  };

  const handlePrint = () => {
    if (!initiatives.length) { toast.error('No data to export'); return; }
    const rows = initiatives.map((i) =>
      `<tr>
        <td>${i.name}</td><td>${i.category}</td><td>${i.priority}</td>
        <td>${i.owner || '—'}</td><td>${i.status}</td><td>${i.progress ?? 0}%</td>
        <td>${i.endDate ? new Date(i.endDate).toLocaleDateString() : '—'}</td>
      </tr>`
    ).join('');
    const html = `<html><head><title>${projectName}</title>
      <style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:600}
      h1{font-size:16px;margin-bottom:12px}</style></head>
      <body><h1>${projectName} — ${getDateStr()}</h1>
      <table><thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Owner</th><th>Status</th><th>Progress</th><th>Due Date</th></tr></thead>
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
