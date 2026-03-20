import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
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
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AssigneeLookup({
  value,
  onChange,
  crew,
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
  const selected = value ? sorted.find((c) => c.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Search assignee"
          disabled={disabled}
          className={cn(
            'justify-between gap-1 font-normal text-gray-900 border-gray-200 bg-white hover:bg-gray-50',
            compact ? 'h-8 text-xs px-2 min-w-[100px] max-w-[220px]' : 'h-8 text-xs w-full',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate min-w-0 flex-1 text-left">
            {selected ? selected.name : '— Unassigned'}
          </span>
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
        </Button>
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
              {sorted.map((c) => (
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
