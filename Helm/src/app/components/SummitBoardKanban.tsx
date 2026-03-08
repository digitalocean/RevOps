import { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Calendar, MessageSquare, Clock, Star } from 'lucide-react';
import type { Initiative, Status } from '../data/mockData';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { Progress } from './ui/progress';

const COLUMNS: { id: string; label: string; statuses: Status[]; color: string; bg: string; headerBg: string }[] = [
  { id: 'not_started', label: 'Not Started', statuses: ['Not Started'], color: '#94a3b8', bg: 'bg-slate-50', headerBg: 'bg-slate-100' },
  { id: 'in_progress', label: 'In Progress', statuses: ['On Track', 'At Risk'], color: '#3b82f6', bg: 'bg-blue-50/40', headerBg: 'bg-blue-50' },
  { id: 'in_review',   label: 'In Review',   statuses: ['In Review'],           color: '#8b5cf6', bg: 'bg-violet-50/40', headerBg: 'bg-violet-50' },
  { id: 'blocked',     label: 'Blocked',     statuses: ['Blocked'],             color: '#f97316', bg: 'bg-amber-50/40', headerBg: 'bg-amber-50' },
  { id: 'done',        label: 'Done',        statuses: ['Complete'],            color: '#22c55e', bg: 'bg-emerald-50/40', headerBg: 'bg-emerald-50' },
];

const STATUS_TO_COLUMN: Record<Status, string> = {
  'Not Started': 'not_started', 'On Track': 'in_progress', 'At Risk': 'in_progress',
  'In Review': 'in_review', 'Blocked': 'blocked', 'Complete': 'done',
};
const COLUMN_TO_STATUS: Record<string, Status> = {
  not_started: 'Not Started', in_progress: 'On Track', in_review: 'In Review',
  blocked: 'Blocked', done: 'Complete',
};
const PRIORITY_STYLE: Record<string, string> = {
  P0: 'bg-rose-50 text-rose-700 border-rose-200',
  P1: 'bg-amber-50 text-amber-700 border-amber-200',
  P2: 'bg-sky-50 text-sky-700 border-sky-200',
};

function KanbanCard({ init, crew, isDrag, onClick }: {
  init: Initiative; crew: { id: string; name: string; initials?: string }[];
  isDrag?: boolean; onClick?: () => void;
}) {
  const owner = init.assignee_id ? crew.find(c => c.id === init.assignee_id) : null;
  const dueStr = init.endDate && !isNaN(init.endDate.getTime())
    ? init.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const isOverdue = init.endDate && init.endDate < new Date() && init.status !== 'Complete';

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick?.()}
      className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer
        transition-all duration-150 ease-out overflow-hidden
        ${isDrag ? 'opacity-90 shadow-lg scale-[1.02] ring-2 ring-indigo-400/40' : 'border-gray-200 hover:border-gray-300'}`}>
      {/* Priority accent stripe */}
      <div className={`h-0.5 w-full ${init.priority === 'P0' ? 'bg-red-400' : init.priority === 'P1' ? 'bg-amber-400' : 'bg-blue-300'}`} />
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          {init.isBigRock && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0 mt-0.5" />}
          <p className="font-medium text-slate-800 text-sm leading-snug line-clamp-2 flex-1">{init.name}</p>
        </div>

        {init.progress > 0 && init.status !== 'Complete' && (
          <div className="mb-3">
            <Progress value={init.progress} className="h-1" />
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">{init.progress}%</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${PRIORITY_STYLE[init.priority] || PRIORITY_STYLE.P2}`}>
            {init.priority}
          </span>
          <div className="flex items-center gap-1.5">
            {dueStr && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                <Calendar className="w-3 h-3" />{dueStr}
              </div>
            )}
            {owner && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0" title={owner.name}>
                {(owner.initials || owner.name.slice(0, 2)).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ id, init, crew, onClick }: { id: string; init: Initiative; crew: { id: string; name: string; initials?: string }[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <KanbanCard init={init} crew={crew} isDrag={isDragging} onClick={onClick} />
    </div>
  );
}

function DroppableColumn({ columnId, label, color, bg, headerBg, count, children, onAddTask }: {
  columnId: string; label: string; color: string; bg: string; headerBg: string;
  count: number; children: React.ReactNode; onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-[280px] flex flex-col rounded-2xl min-h-[400px] border-2 transition-all duration-200
      ${isOver ? 'border-indigo-300 bg-indigo-50/60 shadow-inner' : `border-gray-200/60 ${bg}`}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-t-2xl ${headerBg} border-b border-gray-200/60`}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
        <span className="font-semibold text-slate-800 text-sm flex-1">{label}</span>
        <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/80">{count}</span>
      </div>
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
        {children}
        <button type="button" onClick={onAddTask}
          className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all duration-200 border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-white/50">
          + Add task
        </button>
      </div>
    </div>
  );
}

interface SummitBoardKanbanProps {
  initiatives: Initiative[];
  crew: { id: string; name: string; initials?: string }[];
  currentUser?: { id: string; name: string } | null;
  onUpdateStatus: (itemId: string, status: Status) => Promise<unknown>;
  onUpdateItem: (itemId: string, payload: Record<string, unknown>) => Promise<unknown>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddItem: () => void;
}

export function SummitBoardKanban({ initiatives, crew = [], currentUser, onUpdateStatus, onUpdateItem, onDeleteItem, onAddItem }: SummitBoardKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const getItemsForCol = (col: string) => initiatives.filter(i => STATUS_TO_COLUMN[i.status] === col);
  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const taskId = String(active.id);
    const colId = String(over.id);
    const init = initiatives.find(i => i.id === taskId);
    if (!init || STATUS_TO_COLUMN[init.status] === colId) return;
    const newStatus = COLUMN_TO_STATUS[colId];
    if (newStatus) await onUpdateStatus(taskId, newStatus);
  };
  const activeInit = activeId ? initiatives.find(i => i.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[440px] px-1 pt-1">
        {COLUMNS.map(col => {
          const items = getItemsForCol(col.id);
          return (
            <DroppableColumn key={col.id} columnId={col.id} label={col.label} color={col.color}
              bg={col.bg} headerBg={col.headerBg} count={items.length} onAddTask={onAddItem}>
              {items.map(init => (
                <DraggableCard key={init.id} id={init.id} init={init} crew={crew}
                  onClick={() => setSelectedInitiative(init)} />
              ))}
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeInit ? <div className="rotate-2 scale-105 opacity-95"><KanbanCard init={activeInit} crew={crew} isDrag /></div> : null}
      </DragOverlay>
      {selectedInitiative && (
        <TaskDetailDrawer
          initiative={selectedInitiative}
          crew={crew}
          currentUser={currentUser}
          onClose={() => setSelectedInitiative(null)}
          onSave={async (id, payload) => { await onUpdateItem(id, payload as Record<string, unknown>); }}
          onDelete={async (id) => { await onDeleteItem(id); setSelectedInitiative(null); }}
        />
      )}
    </DndContext>
  );
}
