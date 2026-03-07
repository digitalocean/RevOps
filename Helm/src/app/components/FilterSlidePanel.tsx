import { X, Plus, Filter } from 'lucide-react';
import { Button } from './ui/button';
import type { Status, Priority, Category } from '../data/mockData';

export interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const FIELD_OPTIONS = ['Status', 'Priority', 'Owner', 'Category', 'Due Date'];
const OPERATOR_OPTIONS = ['is', 'is not', 'contains', 'before', 'after', 'is empty', 'is not empty'];

function deriveFilters(rows: FilterRow[]): DerivedFilters {
  const status: Status[] = [];
  const priority: Priority[] = [];
  const category: Category[] = [];
  const owner: string[] = [];
  rows.forEach((r) => {
    if (r.operator !== 'is' && r.operator !== 'is not') return;
    if (r.field === 'Status' && r.value) status.push(r.value as Status);
    if (r.field === 'Priority' && r.value) priority.push(r.value as Priority);
    if (r.field === 'Category' && r.value) category.push(r.value as Category);
    if (r.field === 'Owner' && r.value) owner.push(r.value);
  });
  return { status, priority, category, owner, bigRocksOnly: false };
}

export interface DerivedFilters {
  status: Status[];
  priority: Priority[];
  category: Category[];
  owner: string[];
  bigRocksOnly: boolean;
}

interface FilterSlidePanelProps {
  open: boolean;
  onClose: () => void;
  filterRows: FilterRow[];
  onFilterRowsChange: (rows: FilterRow[]) => void;
  filterAndOr: 'AND' | 'OR';
  onFilterAndOrChange: (v: 'AND' | 'OR') => void;
  onApply: (filters: DerivedFilters) => void;
  onSaveAsView: () => void;
  statusOptions: Status[];
  priorityOptions: Priority[];
  categoryOptions: Category[];
  ownerOptions: string[];
}

export function FilterSlidePanel({
  open,
  onClose,
  filterRows,
  onFilterRowsChange,
  filterAndOr,
  onFilterAndOrChange,
  onApply,
  onSaveAsView,
  statusOptions,
  priorityOptions,
  categoryOptions,
  ownerOptions,
}: FilterSlidePanelProps) {
  if (!open) return null;

  const addRow = () => {
    onFilterRowsChange([
      ...filterRows,
      { id: crypto.randomUUID(), field: 'Status', operator: 'is', value: '' },
    ]);
  };

  const removeRow = (id: string) => {
    onFilterRowsChange(filterRows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<FilterRow>) => {
    onFilterRowsChange(
      filterRows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const getValueOptions = (field: string): string[] => {
    if (field === 'Status') return [...statusOptions];
    if (field === 'Priority') return [...priorityOptions];
    if (field === 'Category') return [...categoryOptions];
    if (field === 'Owner') return [...ownerOptions];
    return [];
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 z-50 w-[360px] h-full bg-white border-l border-[#E8E8EC] shadow-xl flex flex-col"
        role="dialog"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8EC]">
          <h2 className="text-base font-semibold text-[#0F0F13]">Filters</h2>
          <div className="flex items-center gap-2">
            {filterRows.length > 0 && (
              <button
                type="button"
                onClick={() => onFilterRowsChange([])}
                className="text-sm text-[#6B7280] hover:text-[var(--accent)]"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-[#6B7280]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filterRows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Match</span>
              <button
                type="button"
                onClick={() => onFilterAndOrChange('AND')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterAndOr === 'AND' ? 'bg-[var(--accent)] text-white' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'}`}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => onFilterAndOrChange('OR')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterAndOr === 'OR' ? 'bg-[var(--accent)] text-white' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'}`}
              >
                OR
              </button>
            </div>
          )}

          {filterRows.map((row) => (
            <div key={row.id} className="flex gap-2 items-start">
              <select
                value={row.field}
                onChange={(e) => updateRow(row.id, { field: e.target.value, value: '' })}
                className="flex-1 min-w-0 rounded-lg border border-[#E4E4EC] px-3 py-2 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none"
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                value={row.operator}
                onChange={(e) => updateRow(row.id, { operator: e.target.value })}
                className="flex-1 min-w-0 rounded-lg border border-[#E4E4EC] px-3 py-2 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none"
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              {(row.operator !== 'is empty' && row.operator !== 'is not empty') && (
                <select
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  className="flex-1 min-w-0 rounded-lg border border-[#E4E4EC] px-3 py-2 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none"
                >
                  <option value="">Select...</option>
                  {getValueOptions(row.field).map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                  {getValueOptions(row.field).length === 0 && row.field === 'Due Date' && (
                    <>
                      <option value="overdue">Overdue</option>
                      <option value="this_week">This week</option>
                      <option value="later">Later</option>
                    </>
                  )}
                </select>
              )}
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-red-600"
                aria-label="Remove filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[#5254CC]"
          >
            <Plus className="w-4 h-4" />
            Add filter
          </button>
        </div>

        <div className="p-4 border-t border-[#E8E8EC] flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-lg"
            onClick={() => onApply(deriveFilters(filterRows))}
          >
            Apply
          </Button>
          <Button
            type="button"
            onClick={onSaveAsView}
            className="flex-1 bg-[var(--accent)] hover:bg-[#5254CC] text-white rounded-lg"
          >
            Save as View
          </Button>
        </div>
      </div>
    </>
  );
}
