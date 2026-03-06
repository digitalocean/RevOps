import { Plus, User, Bell, Search, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface WorkspaceTab {
  id: string;
  name: string;
  isActive?: boolean;
}

const workspaceTabs: WorkspaceTab[] = [
  { id: 'revenue-ops', name: 'Revenue Operations', isActive: true },
  { id: 'deal-desk', name: 'Deal Desk' }
];

interface WorkspaceHeaderProps {
  onToggleActivity?: () => void;
}

export function WorkspaceHeader({ onToggleActivity }: WorkspaceHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          {workspaceTabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab.isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.name}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Search className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 relative"
            onClick={onToggleActivity}
          >
            <Activity className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
            March 6, 2026
          </Badge>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cursor-pointer">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}