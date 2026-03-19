import { useState, useEffect, useMemo } from 'react';
import { Search, Command, FileText, User, Calendar, Star, Tag, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import type { Initiative, Status } from '../data/mockData';

const STATUS_DOT: Record<Status, string> = {
  'On Track': 'bg-emerald-500', 'At Risk': 'bg-amber-500', 'In Review': 'bg-violet-500',
  'Complete': 'bg-blue-500', 'Blocked': 'bg-red-500', 'Not Started': 'bg-gray-300',
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInitiative: (initiative: Initiative) => void;
  initiatives?: Initiative[];
  projects?: { id: string; name: string }[];
}

export function GlobalSearch({ open, onOpenChange, onSelectInitiative, initiatives = [], projects = [] }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return initiatives.slice(0, 8);
    const q = query.toLowerCase();
    return initiatives.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      i.owner.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      i.priority.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, initiatives]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { if (!open) { setQuery(''); setSelectedIndex(0); } }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && results[selectedIndex]) { e.preventDefault(); handleSelect(results[selectedIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex]);

  const handleSelect = (init: Initiative) => { onSelectInitiative(init); onOpenChange(false); };

  const hl = (text: string) => {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return <>{text}</>;
    return <>{text.slice(0, idx)}<mark className="bg-yellow-100 text-yellow-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Search tasks, owners, status…" value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent" autoFocus />
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 rounded px-2 py-1 flex-shrink-0">
            <Command className="w-3 h-3" /><span>K</span>
          </div>
        </div>
        <ScrollArea className="max-h-[440px]">
          <div className="p-2">
            {!query && results.length > 0 && <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-3 py-2">Recent tasks</p>}
            {query && results.length === 0 && (
              <div className="py-10 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No tasks matching <strong>"{query}"</strong></p>
              </div>
            )}
            {results.map((init, index) => {
              const dot = STATUS_DOT[init.status] || 'bg-gray-300';
              const isSelected = index === selectedIndex;
              const dueStr = init.endDate && !isNaN(init.endDate.getTime()) ? init.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
              return (
                <button key={init.id} onClick={() => handleSelect(init)} onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-3 rounded-xl mb-0.5 flex items-center gap-3 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex-shrink-0">
                    {init.isBigRock ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <FileText className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{hl(init.name)}</span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-xs text-gray-400 flex-shrink-0">{init.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3" />{init.category}</span>
                      {init.owner && init.owner !== '—' && <span className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{hl(init.owner)}</span>}
                      {dueStr && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{dueStr}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${init.priority === 'P0' ? 'bg-red-100 text-red-700' : init.priority === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{init.priority}</span>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100 text-indigo-400' : 'opacity-0'}`} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono text-[10px]">↵</kbd> Open</span>
            <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded font-mono text-[10px]">esc</kbd> Close</span>
          </div>
          <span className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
