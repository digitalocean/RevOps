import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Cmd', 'K'], description: 'Open global search', category: 'Navigation' },
  { keys: ['Cmd', 'Shift', 'A'], description: 'Open analytics dashboard', category: 'Navigation' },
  { keys: ['Cmd', 'Shift', 'F'], description: 'Focus filter panel', category: 'Navigation' },
  { keys: ['Cmd', 'Shift', 'Q'], description: 'Open quick actions', category: 'Navigation' },
  { keys: ['Cmd', 'Shift', 'E'], description: 'Open export menu', category: 'Navigation' },
  
  // View Management
  { keys: ['Cmd', '1'], description: 'Switch to grid view', category: 'Views' },
  { keys: ['Cmd', '2'], description: 'Switch to gantt view', category: 'Views' },
  { keys: ['Cmd', 'B'], description: 'Toggle Big Rocks filter', category: 'Views' },
  { keys: ['Cmd', 'S'], description: 'Save current view', category: 'Views' },
  
  // Actions
  { keys: ['N'], description: 'Create new initiative', category: 'Actions' },
  { keys: ['Cmd', 'A'], description: 'Select all initiatives', category: 'Actions' },
  { keys: ['Esc'], description: 'Clear selection / Close dialog', category: 'Actions' },
  { keys: ['Del'], description: 'Delete selected initiatives', category: 'Actions' },
  
  // Misc
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Help' },
  { keys: ['Cmd', '/'], description: 'Toggle activity panel', category: 'Help' },
];

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-700 min-w-[28px] text-center">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
        </span>
      ))}
    </div>
  );
}

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {categories.map(category => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs font-semibold">
                  {category}
                </Badge>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <KeyCombo keys={shortcut.keys} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs mx-1">?</kbd> 
            anywhere in the app to open this dialog quickly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}