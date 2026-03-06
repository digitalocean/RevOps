import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from './ui/dropdown-menu';
import { toast } from 'sonner';

export function ExportMenu() {
  const handleExport = (format: string) => {
    toast.success(`Exporting data as ${format}...`, {
      description: 'Your download will start shortly'
    });
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
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleExport('CSV')}>
          <FileSpreadsheet className="w-4 h-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleExport('Excel')}>
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleExport('PDF')}>
          <FileText className="w-4 h-4 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleExport('JSON')}>
          <FileJson className="w-4 h-4 text-blue-600" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
