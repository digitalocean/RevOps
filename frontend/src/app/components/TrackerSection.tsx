import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, MessageSquare, Paperclip, Clock, Star } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from './ui/dropdown-menu';
import { InitiativeDetailsDialog } from './InitiativeDetailsDialog';
import type { Initiative, Priority, Status, Category, TrackerSection as TrackerSectionType } from '../data/mockData';

interface TrackerSectionProps {
  section: TrackerSectionType;
  viewMode: 'grid' | 'gantt';
  filters: {
    status: Status[];
    priority: Priority[];
    category: Category[];
    owner: string[];
    bigRocksOnly: boolean;
  };
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'P0': return 'bg-red-100 text-red-700 border-red-200';
    case 'P1': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'P2': return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'On Track': return 'bg-green-500 text-white hover:bg-green-600';
    case 'At Risk': return 'bg-yellow-500 text-white hover:bg-yellow-600';
    case 'Complete': return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'Blocked': return 'bg-red-500 text-white hover:bg-red-600';
    case 'Not Started': return 'bg-gray-300 text-gray-700 hover:bg-gray-400';
  }
}

function getCategoryColor(category: Category): string {
  switch (category) {
    case 'Engineering': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Design': return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'Sales': return 'bg-green-50 text-green-700 border-green-200';
    case 'Product': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Operations': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
}

interface InitiativeRowProps {
  initiative: Initiative;
  onOpenDetails: (initiative: Initiative) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

function InitiativeRow({ initiative, onOpenDetails, isSelected, onToggleSelect }: InitiativeRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <tr 
      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenDetails(initiative)}
    >
      <td className="py-3 px-4 w-12" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(initiative.id)}
        />
      </td>
      <td className="py-3 px-4 w-12">
        <div className="flex items-center justify-center">
          {initiative.isBigRock ? (
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{initiative.name}</span>
          {isHovered && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); }}>
                <MessageSquare className="w-3 h-3 text-gray-400" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); }}>
                <Paperclip className="w-3 h-3 text-gray-400" />
              </Button>
            </div>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={`${getCategoryColor(initiative.category)} text-xs font-medium`}>
          {initiative.category}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={`${getPriorityColor(initiative.priority)} text-xs font-semibold`}>
          {initiative.priority}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
            {initiative.owner.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="text-sm text-gray-700">{initiative.owner}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge className={`${getStatusColor(initiative.status)} text-xs font-medium border-0`}>
          {initiative.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Progress value={initiative.progress} className="w-24 h-2" />
          <span className="text-xs text-gray-600 font-medium w-10">{initiative.progress}%</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{initiative.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Initiative</DropdownMenuItem>
            <DropdownMenuItem>Add Comment</DropdownMenuItem>
            <DropdownMenuItem>Attach File</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function TrackerSection({ section, viewMode, filters, selectedIds, onSelectionChange }: TrackerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  if (viewMode === 'gantt') {
    return null;
  }

  // Apply filters
  const filteredInitiatives = section.initiatives.filter(initiative => {
    if (filters.status.length > 0 && !filters.status.includes(initiative.status)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(initiative.priority)) return false;
    if (filters.category.length > 0 && !filters.category.includes(initiative.category)) return false;
    if (filters.owner.length > 0 && !filters.owner.includes(initiative.owner)) return false;
    if (filters.bigRocksOnly && !initiative.isBigRock) return false;
    return true;
  });

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredInitiatives.map(i => i.id);
    const allSelected = allIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      onSelectionChange(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      const newSelection = [...new Set([...selectedIds, ...allIds])];
      onSelectionChange(newSelection);
    }
  };

  const allSelected = filteredInitiatives.length > 0 && 
    filteredInitiatives.every(i => selectedIds.includes(i.id));
  const someSelected = filteredInitiatives.some(i => selectedIds.includes(i.id)) && !allSelected;

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              {section.title}
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full">
                {filteredInitiatives.length}
              </span>
            </button>
            
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8">
              <Plus className="w-4 h-4" />
              Add Initiative
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-12">
                    <Checkbox 
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as any).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-12"></th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Initiative
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Priority
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Owner
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Progress
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Due Date
                  </th>
                  <th className="py-2 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="group">
                {filteredInitiatives.map((initiative) => (
                  <InitiativeRow 
                    key={initiative.id} 
                    initiative={initiative}
                    onOpenDetails={setSelectedInitiative}
                    isSelected={selectedIds.includes(initiative.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
                {filteredInitiatives.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 px-4 text-center text-sm text-gray-500">
                      No initiatives match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInitiative && (
        <InitiativeDetailsDialog
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
        />
      )}
    </>
  );
}