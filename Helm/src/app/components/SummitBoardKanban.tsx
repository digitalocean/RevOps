import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Calendar } from 'lucide-react';
import type { Initiative, Status } from '../data/mockData';
import { InitiativeDetailsDialog } from './InitiativeDetailsDialog';

const COLUMNS: { id: string; label: string; statuses: Status[]; color: string; bg: string }[] = [
  { id: 'not_started', label: 'Not Started', statuses: ['Not Started'], color: '#94a3b8', bg: 'bg-slate-100' },
  { id: 'in_progress', label: 'In Progress', statuses: ['On Track', 'At Risk'], color: '#3b82f6', bg: 'bg-blue-50' },
  { id: 'in_review', label: 'In Review', statuses: ['In Review'], color: '#8b5cf6', bg: 'bg-violet-50' },
  { id: 'blocked', label: 'Blocked', statuses: ['Blocked'], color: '#f97316', bg: 'bg-amber-50' },
  { id: 'done', label: 'Done', statuses: ['Complete'], color: '#22c55e', bg: 'bg-emerald-50' },
];

const STATUS_TO_COLUMN: Record<Status, string> = {
  'Not Started': 'not_started',
  'On Track': 'in_progress',
  'At Risk': 'in_progress',
  'In Review': 'in_review',
  'Blocked': 'blocked',
  'Complete': 'done',
};

const COLUMN_TO_STATUS: Record<string, Status> = {
  not_started: 'Not Started',
  in_progress: 'On Track',
  in_review: 'In Review',
  blocked: 'Blocked',
  done: 'Complete',
};

const PRIORITY_STYLE: Record<string, string> = {
  P0: 'bg-rose-500/12 text-rose-700 border-rose-200',
  P1: 'bg-amber-500/12 text-amber-700 border-amber-200',
  P2: 'bg-sky-500/12 text-sky-700 border-sky-200',
  P3: 'bg-slate-200/80 text-slate-600 border-slate-200',
};

function KanbanCard({
  init,
  crew,
  isDrag,
  onClick,
}: {
  init: Initiative;
  crew: { id: string; name: string; initials?: string }[];
  isDrag?: boolean;
  onClick?: () => void;
}) {
  const owner = init.assignee_id ? crew.find((c) => c.id === init.assignee_id) : null;
  const dueStr = init.endDate && !isNaN(init.endDate.getTime()) ? init.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`
        group relative bg-white rounded-xl border border-slate-200/90 p-4
        shadow-[0_1px_3px_rgba(0,0,0,0.05)]
        hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] hover:border-slate-300/80
        hover:-translate-y-0.5 cursor-grab active:cursor-grabbing
        transition-all duration-200 ease-out
        ${isDrag ? 'opacity-90 shadow-lg scale-[1.02] ring-2 ring-blue-400/30' : ''}
      `}
    >
      <p className="font-medium text-slate-800 text-sm leading-snug line-clamp-2">{init.name}</p>
      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${PRIORITY_STYLE[init.priority] || PRIORITY_STYLE.P3}`}>
          {init.priority}
        </span>
        {owner && (
          <div
            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm"
            title={owner.name}
          >
            {owner.initials || owner.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      {dueStr && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {dueStr}
        </div>
      )}
    </div>
  );
}

function DraggableCard({
  id,
  init,
  crew,
  onClick,
}: {
  id: string;
  init: Initiative;
  crew: { id: string; name: string; initials?: string }[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <KanbanCard init={init} crew={crew} isDrag={isDragging} onClick={onClick} />
    </div>
  );
}

function DroppableColumn({
  columnId,
  label,
  color,
  bg,
  count,
  children,
  onAddTask,
}: {
  columnId: string;
  label: string;
  color: string;
  bg: string;
  count: number;
  children: React.ReactNode;
  onAddTask: () => void;
}) {
  const [hover, setHover] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const showAdd = hover || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[300px] flex flex-col rounded-2xl min-h-[380px] border-2 border-dashed transition-all duration-200 ${
        isOver ? 'border-slate-400 bg-slate-50/80' : 'border-slate-200/60 bg-slate-50/30'
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`flex items-center gap-3 px-4 py-3 rounded-t-2xl ${bg} border-b border-slate-200/60`}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
        <span className="font-semibold text-slate-800 text-sm">{label}</span>
        <span className="ml-auto text-xs font-medium text-slate-500 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
          {count}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {children}
        <button
          type="button"
          onClick={onAddTask}
          className={`
            w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium
            transition-all duration-200
            ${showAdd ? 'border-blue-300 bg-blue-50/50 text-blue-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500 hover:bg-slate-50/50'}
          `}
        >
          + Add task
        </button>
      </div>
    </div>
  );
}

interface SummitBoardKanbanProps {
  initiatives: Initiative[];
  crew: { id: string; name: string; initials?: string }[];
  onUpdateStatus: (itemId: string, status: Status) => Promise<unknown>;
  onUpdateItem: (itemId: string, payload: Record<string, unknown>) => Promise<unknown>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: () => void;
}

export function SummitBoardKanban({
  initiatives,
  crew = [],
  onUpdateStatus,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: SummitBoardKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getInitiativesForColumn = (columnId: string) =>
    initiatives.filter((i) => STATUS_TO_COLUMN[i.status] === columnId);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const taskId = String(active.id);
    const targetColumnId = String(over.id);
    const initiative = initiatives.find((i) => i.id === taskId);
    if (!initiative || STATUS_TO_COLUMN[initiative.status] === targetColumnId) return;
    const newStatus = COLUMN_TO_STATUS[targetColumnId];
    if (!newStatus) return;
    await onUpdateStatus(taskId, newStatus);
  };

  const activeInit = activeId ? initiatives.find((i) => i.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-6 min-h-[420px] px-1">
        {COLUMNS.map((col) => {
          const items = getInitiativesForColumn(col.id);
          return (
            <DroppableColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              color={col.color}
              bg={col.bg}
              count={items.length}
              onAddTask={onAddItem}
            >
              {items.map((init) => (
                <DraggableCard
                  key={init.id}
                  id={init.id}
                  init={init}
                  crew={crew}
                  onClick={() => setSelectedInitiative(init)}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeInit ? (
          <div className="rotate-2 scale-105 opacity-95">
            <KanbanCard init={activeInit} crew={crew} isDrag />
          </div>
        ) : null}
      </DragOverlay>

      {selectedInitiative && (
        <InitiativeDetailsDialog
          initiative={selectedInitiative}
          crew={crew}
          onClose={() => setSelectedInitiative(null)}
          onSave={async (id, payload) => {
            await onUpdateItem(id, payload);
            setSelectedInitiative(null);
          }}
          onDelete={onDeleteItem ? async (id) => { await onDeleteItem(id); setSelectedInitiative(null); } : undefined}
        />
      )}
    </DndContext>
  );
}
