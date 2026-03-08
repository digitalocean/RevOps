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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
            {selectedCount}
          </div>
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-6 w-px bg-gray-600" />

        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          onClick={() => onBulkDelete()}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete
        </Button>

        <div className="h-6 w-px bg-gray-600" />

        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-gray-400 hover:text-white hover:bg-gray-700"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
