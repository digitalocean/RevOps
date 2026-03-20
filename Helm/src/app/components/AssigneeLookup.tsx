import { useMemo, useState } from 'react';
import { Check, Search, User } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export type AssigneeLookupMember = {
  id: string;
  name: string;
  initials?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

interface AssigneeLookupProps {
  value: string | null | undefined;
  onChange: (assigneeId: string | null) => void;
  crew: AssigneeLookupMember[];
  /** When value is set but that id is missing from crew (stale list), show this label */
  fallbackLabel?: string | null;
  /** Email for tooltip when assignee not in crew list */
  fallbackEmail?: string | null;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

function twoCharLabel(m: AssigneeLookupMember | undefined, fallbackName: string): string {
  const raw = (m?.initials || '').trim();
  if (raw.length >= 2) return raw.slice(0, 2).toUpperCase();
  const fn = (m?.first_name || '').trim();
  const ln = (m?.last_name || '').trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  const n = (m?.name || fallbackName || '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  return '??';
}

export function AssigneeLookup({
  value,
  onChange,
  crew,
  fallbackLabel,
  fallbackEmail,
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

  const tooltipEmail = member?.email?.trim() || fallbackEmail?.trim() || '';

  const avatarLetters = twoCharLabel(
    member,
    (value && fallbackLabel?.trim() ? fallbackLabel.trim() : '') || ''
  );

  /** Include current assignee in the list if API list is missing that id */
  const listMembers = useMemo(() => {
    if (value && !sorted.some((c) => c.id === value) && fallbackLabel?.trim()) {
      const extra: AssigneeLookupMember = {
        id: value,
        name: fallbackLabel.trim(),
        email: fallbackEmail ?? undefined,
      };
      return [...sorted, extra].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }
    return sorted;
  }, [sorted, value, fallbackLabel, fallbackEmail]);

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
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            {value ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold uppercase text-indigo-800"
                      tabIndex={-1}
                    >
                      {avatarLetters}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs border-0 bg-gray-900 text-gray-50">
                    {tooltipEmail ? (
                      <>
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[11px] text-gray-300 break-all">{tooltipEmail}</p>
                      </>
                    ) : (
                      <p className="text-xs">{label}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
                <User className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                <span className="truncate">{label}</span>
              </>
            ) : (
              <>
                <span className="truncate text-gray-500">— Unassigned</span>
              </>
            )}
          </span>
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
                  <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-semibold text-indigo-800">
                    {twoCharLabel(c, c.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.email ? (
                    <span className="max-w-[90px] truncate text-[10px] text-gray-400" title={c.email}>
                      {c.email}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
