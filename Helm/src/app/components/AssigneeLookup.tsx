import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal text-gray-900 border-gray-200 bg-white hover:bg-gray-50',
            compact ? 'h-8 text-xs px-2 min-w-[100px] max-w-[200px]' : 'h-8 text-xs w-full',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">
            {selected ? selected.name : '— Unassigned'}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[260px] p-0 z-[130]"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
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
