import { X, CheckCircle2, AlertCircle, Ban, User, Tag, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import type { Status, Priority } from '../data/mockData';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusChange: (status: Status) => void;
  onBulkPriorityChange: (priority: Priority) => void;
  onBulkDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
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
            {selectedCount} initiative{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-6 w-px bg-gray-600" />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onBulkStatusChange('On Track')}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  On Track
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange('At Risk')}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  At Risk
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange('Blocked')}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Blocked
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange('Complete')}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Complete
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatusChange('Not Started')}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Not Started
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                <Tag className="w-4 h-4 mr-1.5" />
                Change Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onBulkPriorityChange('P0')}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  P0 - Critical
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkPriorityChange('P1')}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  P1 - High
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkPriorityChange('P2')}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  P2 - Medium
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-8 bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
                <User className="w-4 h-4 mr-1.5" />
                Assign Owner
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {['Sarah Chen', 'Marcus Rodriguez', 'Emily Watson', 'David Park', 'Lisa Kumar'].map(owner => (
                <DropdownMenuItem key={owner} onClick={() => {
                  toast.success(`Assigned ${selectedCount} initiative${selectedCount !== 1 ? 's' : ''} to ${owner}`);
                }}>
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  {owner}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
        </div>

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
