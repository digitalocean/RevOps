import { X, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)] border border-white/10 px-3 py-2 flex items-center gap-2 backdrop-blur">
        <div className="flex items-center gap-2 pl-2">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold tabular-nums shadow-[0_2px_6px_rgba(79,70,229,0.5)]">
            {selectedCount}
          </div>
          <span className="text-sm font-medium pr-1">
            selected
          </span>
        </div>

        <div className="h-5 w-px bg-white/15" />

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-rose-300 hover:text-white hover:bg-rose-500/30"
          onClick={() => onBulkDelete()}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete
        </Button>

        <div className="h-5 w-px bg-white/15" />

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
          onClick={onClearSelection}
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
