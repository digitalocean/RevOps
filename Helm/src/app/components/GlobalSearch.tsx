import { useState, useEffect } from 'react';
import { Search, Command, FileText, User, Calendar, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { mockInitiatives, type Initiative } from '../data/mockData';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInitiative: (initiative: Initiative) => void;
}

export function GlobalSearch({ open, onOpenChange, onSelectInitiative }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Initiative[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = mockInitiatives.filter(initiative => 
      initiative.name.toLowerCase().includes(lowerQuery) ||
      initiative.description.toLowerCase().includes(lowerQuery) ||
      initiative.owner.toLowerCase().includes(lowerQuery) ||
      initiative.category.toLowerCase().includes(lowerQuery)
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex]);

  const handleSelect = (initiative: Initiative) => {
    onSelectInitiative(initiative);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search initiatives, owners, descriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
              autoFocus
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {query && results.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                No initiatives found for "{query}"
              </div>
            )}

            {results.map((initiative, index) => (
              <button
                key={initiative.id}
                onClick={() => handleSelect(initiative)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  index === selectedIndex 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FileText className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {initiative.isBigRock && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {initiative.name}
                      </h4>
                    </div>
                    
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {initiative.description}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {initiative.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {initiative.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        {initiative.owner}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {initiative.endDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">ESC</kbd>
                <span>Close</span>
              </div>
            </div>
            {results.length > 0 && (
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
