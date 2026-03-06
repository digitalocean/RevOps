import { useState } from 'react';
import { Bookmark, Plus, Trash2, Check, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import type { Status, Priority, Category } from '../data/mockData';

interface SavedView {
  id: string;
  name: string;
  filters: {
    status: Status[];
    priority: Priority[];
    category: Category[];
    owner: string[];
    bigRocksOnly: boolean;
  };
  isDefault?: boolean;
}

interface SavedViewsMenuProps {
  currentFilters: {
    status: Status[];
    priority: Priority[];
    category: Category[];
    owner: string[];
    bigRocksOnly: boolean;
  };
  onApplyView: (filters: SavedView['filters']) => void;
}

const defaultViews: SavedView[] = [
  {
    id: 'all-big-rocks',
    name: 'Big Rocks Only',
    filters: {
      status: [],
      priority: [],
      category: [],
      owner: [],
      bigRocksOnly: true,
    },
    isDefault: true,
  },
  {
    id: 'at-risk',
    name: 'At Risk & Blocked',
    filters: {
      status: ['At Risk', 'Blocked'],
      priority: [],
      category: [],
      owner: [],
      bigRocksOnly: false,
    },
    isDefault: true,
  },
  {
    id: 'high-priority',
    name: 'P0 Critical Items',
    filters: {
      status: [],
      priority: ['P0'],
      category: [],
      owner: [],
      bigRocksOnly: false,
    },
    isDefault: true,
  },
];

export function SavedViewsMenu({ currentFilters, onApplyView }: SavedViewsMenuProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>(defaultViews);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  const hasActiveFilters = 
    currentFilters.status.length > 0 ||
    currentFilters.priority.length > 0 ||
    currentFilters.category.length > 0 ||
    currentFilters.owner.length > 0 ||
    currentFilters.bigRocksOnly;

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }

    const newView: SavedView = {
      id: `custom-${Date.now()}`,
      name: newViewName,
      filters: currentFilters,
    };

    setSavedViews([...savedViews, newView]);
    setShowSaveDialog(false);
    setNewViewName('');
    toast.success(`Saved view "${newViewName}"`);
  };

  const handleDeleteView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view?.isDefault) {
      toast.error('Cannot delete default views');
      return;
    }

    setSavedViews(savedViews.filter(v => v.id !== viewId));
    toast.success('View deleted');
  };

  const getFilterSummary = (filters: SavedView['filters']) => {
    const parts = [];
    if (filters.status.length > 0) parts.push(`${filters.status.length} status`);
    if (filters.priority.length > 0) parts.push(`${filters.priority.length} priority`);
    if (filters.category.length > 0) parts.push(`${filters.category.length} category`);
    if (filters.owner.length > 0) parts.push(`${filters.owner.length} owner`);
    if (filters.bigRocksOnly) parts.push('Big Rocks');
    
    return parts.length > 0 ? parts.join(', ') : 'No filters';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Views
            {savedViews.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-xs">
                {savedViews.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Saved Views</span>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setShowSaveDialog(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Save Current
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {savedViews.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No saved views yet
            </div>
          ) : (
            <>
              {savedViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-start justify-between py-2 cursor-pointer"
                  onClick={() => {
                    onApplyView(view.filters);
                    toast.success(`Applied view "${view.name}"`);
                  }}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="flex items-center gap-2 mb-1">
                      {view.isDefault && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {view.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {getFilterSummary(view.filters)}
                    </p>
                  </div>
                  {!view.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteView(view.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {savedViews.length > 0 && hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowSaveDialog(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save Current View
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Give your filter configuration a name to quickly access it later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                placeholder="e.g., My Team's P0 Items"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveView();
                  }
                }}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase">Current Filters</p>
              <p className="text-sm text-gray-600">
                {getFilterSummary(currentFilters)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView}>
              <Check className="w-4 h-4 mr-2" />
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
