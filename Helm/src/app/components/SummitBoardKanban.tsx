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

const COLUMNS: { id: string; label: string; statuses: Status[]; color: string }[] = [
  { id: 'not_started', label: 'Not Started', statuses: ['Not Started'], color: '#6b7280' },
  { id: 'in_progress', label: 'In Progress', statuses: ['On Track', 'At Risk'], color: '#2563eb' },
  { id: 'in_review', label: 'In Review', statuses: ['In Review'], color: '#7c3aed' },
  { id: 'blocked', label: 'Blocked', statuses: ['Blocked'], color: '#ea580c' },
  { id: 'done', label: 'Done', statuses: ['Complete'], color: '#059669' },
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

const PRIORITY_COLOR: Record<string, string> = {
  P0: 'bg-red-100 text-red-700',
  P1: 'bg-orange-100 text-orange-700',
  P2: 'bg-blue-100 text-blue-700',
  P3: 'bg-gray-100 text-gray-600',
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
  const dueStr = init.endDate && !isNaN(init.endDate.getTime()) ? init.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`
        bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing
        hover:shadow-md transition-shadow
        ${isDrag ? 'opacity-50 border-dashed' : ''}
      `}
    >
      <p className="font-medium text-gray-900 text-sm line-clamp-2">{init.name}</p>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[init.priority] || 'bg-gray-100 text-gray-600'}`}>
          {init.priority}
        </span>
        {owner && (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white" title={owner.name}>
            <span className="text-[10px] font-medium">{owner.initials || owner.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>
      {dueStr && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
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
  count,
  children,
  onAddTask,
}: {
  columnId: string;
  label: string;
  color: string;
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
      className="flex-shrink-0 w-72 flex flex-col rounded-lg border-2 border-gray-200 bg-gray-50/50 min-h-[320px]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ borderTopColor: isOver ? color : undefined }}
    >
      <div
        className="px-3 py-2 rounded-t-lg text-sm font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {label}
        <span className="ml-2 opacity-90">{count}</span>
      </div>
      <div className={`flex-1 p-2 space-y-2 overflow-y-auto ${isOver ? 'bg-blue-50/30' : ''}`}>
        {children}
        {showAdd && (
          <button
            type="button"
            onClick={onAddTask}
            className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-white/60 hover:border-blue-300 hover:text-blue-600"
          >
            + Add task
          </button>
        )}
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
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
        {COLUMNS.map((col) => {
          const items = getInitiativesForColumn(col.id);
          return (
            <DroppableColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              color={col.color}
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
          <div className="opacity-90 rotate-1 shadow-lg">
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
