import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import type { Status, Priority, Category } from '../data/mockData';

interface FilterPanelProps {
  filters: {
    status: Status[];
    priority: Priority[];
    category: Category[];
    owner: string[];
    bigRocksOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
}

const statusOptions: Status[] = ['On Track', 'At Risk', 'Complete', 'Blocked', 'Not Started'];
const priorityOptions: Priority[] = ['P0', 'P1', 'P2'];
const categoryOptions: Category[] = ['Engineering', 'Design', 'Sales', 'Product', 'Operations'];
const ownerOptions = ['Sarah Chen', 'Marcus Rodriguez', 'Emily Watson', 'David Park', 'Lisa Kumar', 'James Mitchell', 'Alex Thompson', 'Nina Patel', 'Robert Kim', 'Jennifer Lopez'];

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = 
    filters.status.length + 
    filters.priority.length + 
    filters.category.length + 
    filters.owner.length + 
    (filters.bigRocksOnly ? 1 : 0);

  const toggleStatus = (status: Status) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const togglePriority = (priority: Priority) => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter(p => p !== priority)
      : [...filters.priority, priority];
    onFiltersChange({ ...filters, priority: newPriority });
  };

  const toggleCategory = (category: Category) => {
    const newCategory = filters.category.includes(category)
      ? filters.category.filter(c => c !== category)
      : [...filters.category, category];
    onFiltersChange({ ...filters, category: newCategory });
  };

  const toggleOwner = (owner: string) => {
    const newOwner = filters.owner.includes(owner)
      ? filters.owner.filter(o => o !== owner)
      : [...filters.owner, owner];
    onFiltersChange({ ...filters, owner: newOwner });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: [],
      priority: [],
      category: [],
      owner: [],
      bigRocksOnly: false
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-sm">Filter initiatives</h4>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700">
              Clear all
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Priority</Label>
            <div className="space-y-2">
              {priorityOptions.map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={filters.priority.includes(priority)}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <Label
                    htmlFor={`priority-${priority}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {priority}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Category Filter */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Category</Label>
            <div className="space-y-2">
              {categoryOptions.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={filters.category.includes(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Owner Filter */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Owner</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {ownerOptions.map((owner) => (
                <div key={owner} className="flex items-center space-x-2">
                  <Checkbox
                    id={`owner-${owner}`}
                    checked={filters.owner.includes(owner)}
                    onCheckedChange={() => toggleOwner(owner)}
                  />
                  <Label
                    htmlFor={`owner-${owner}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {owner}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Big Rocks Only */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="big-rocks-only"
              checked={filters.bigRocksOnly}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, bigRocksOnly: checked })}
            />
            <Label
              htmlFor="big-rocks-only"
              className="text-sm font-semibold cursor-pointer"
            >
              Show Big Rocks only
            </Label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
