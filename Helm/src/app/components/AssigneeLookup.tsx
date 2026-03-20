import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from './ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';

export type AssigneeLookupMember = { id: string; name: string; initials?: string };

interface AssigneeLookupProps {
  value: string | null | undefined;
  onChange: (assigneeId: string | null) => void;
  crew: AssigneeLookupMember[];
  /** When value is set but that id is missing from crew (stale list), show this label */
  fallbackLabel?: string | null;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AssigneeLookup({
  value,
  onChange,
  crew,
  fallbackLabel,
  className,
  disabled,
  compact,
}: AssigneeLookupProps) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(
    () =>
      [...crew].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [crew]
  );
  const member = value ? sorted.find((c) => c.id === value) : undefined;
  const label =
    member?.name?.trim() ||
    (value && fallbackLabel?.trim() ? fallbackLabel.trim() : '') ||
    '— Unassigned';

  /** Include current assignee in the list if API list is missing that id */
  const listMembers = useMemo(() => {
    if (value && !sorted.some((c) => c.id === value) && fallbackLabel?.trim()) {
      const extra: AssigneeLookupMember = {
        id: value,
        name: fallbackLabel.trim(),
      };
      return [...sorted, extra].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }
    return sorted;
  }, [sorted, value, fallbackLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Search assignee"
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-between gap-1 rounded-md border border-gray-200 bg-white font-normal text-gray-900 shadow-sm transition-colors',
            'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-400',
            'disabled:pointer-events-none disabled:opacity-50',
            compact ? 'h-8 text-xs px-2 min-w-[120px] max-w-[240px]' : 'h-8 text-xs w-full px-2',
            className
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate min-w-0 flex-1 text-left">{label}</span>
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-500 pointer-events-none" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 z-[10050] shadow-lg border-gray-200"
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-md border-0">
          <CommandInput placeholder="Search people…" className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-3">No one matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__unassigned__"
                className="text-xs"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'h-4 w-4',
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                — Unassigned
              </CommandItem>
              {listMembers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id} ${c.initials ?? ''}`}
                  className="text-xs"
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      value === c.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
