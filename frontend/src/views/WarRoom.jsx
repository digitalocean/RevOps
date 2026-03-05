import React, { useCallback } from 'react';
import { DndContext, DragOverlay, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { triggerConfetti } from '../hooks/useConfetti';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'var(--fog)' },
  { key: 'todo', label: 'On Deck', color: 'var(--sky)' },
  { key: 'in_progress', label: 'Full Sail', color: 'var(--amber)' },
  { key: 'in_review', label: 'On Review', color: 'var(--violet)' },
  { key: 'done', label: 'Anchored', color: 'var(--jade)' },
];

const TYPE_STYLES = {
  epic: { prefix: '◈', bg: 'var(--gold-dim)', color: 'var(--gold2)' },
  story: { prefix: '◎', bg: 'var(--sky-dim)', color: 'var(--sky)' },
  bug: { prefix: '⚠', bg: 'var(--rose-dim)', color: 'var(--rose)' },
  task: { prefix: '✓', bg: 'var(--violet-dim)', color: 'var(--violet)' },
};

const PRIORITY_STYLES = {
  critical: { bg: 'var(--rose-dim)', color: 'var(--rose)' },
  high: { bg: 'var(--rose-dim)', color: 'var(--rose)' },
  medium: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  low: { bg: 'var(--jade-dim)', color: 'var(--jade)' },
};

function Card({ item, columnColor, isDrag }) {
  const typeStyle = TYPE_STYLES[item.type] || TYPE_STYLES.task;
  const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium;
  const assignee = item.assignee_id ? null : null; // would come from team lookup

  return (
    <div
      className="rounded-[var(--r)] p-3.5 cursor-pointer transition-all duration-200 relative overflow-hidden"
      style={{
        background: 'var(--ink2)',
        border: '1px solid var(--border)',
        opacity: isDrag ? 0.5 : 1,
        transform: isDrag ? 'rotate(2deg)' : undefined,
        boxShadow: isDrag ? '0 20px 40px rgba(0,0,0,0.5)' : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: columnColor }}
      />
      <div
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r4)] uppercase tracking-wide mb-2"
        style={{ background: typeStyle.bg, color: typeStyle.color }}
      >
        {typeStyle.prefix} {item.type}
      </div>
      <div className="text-[13px] font-medium leading-snug mb-2.5" style={{ color: 'var(--snow)' }}>
        {item.title}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-mono text-[10px]" style={{ color: 'var(--fog)' }}>
          {item.points ?? 0}pt
        </span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[var(--r4)]"
          style={{ background: priorityStyle.bg, color: priorityStyle.color }}
        >
          {item.priority}
        </span>
        {item.assignee_id && (
          <div
            className="w-5 h-5 rounded-full ml-auto flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ id, children, color }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="w-[260px] flex-shrink-0 flex flex-col gap-2 rounded-[var(--r)] p-1 transition-all"
      style={{
        border: isOver ? '1px solid var(--gold)' : '1px solid transparent',
        background: isOver ? 'var(--gold-dim)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function DraggableCard({ item, columnColor, onOpen }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={() => onOpen(item)}>
      <Card item={item} columnColor={columnColor} isDrag={isDragging} />
    </div>
  );
}

export default function WarRoom({ onOpenItem, onAddItem }) {
  const { items, selectedSprintId, fetchJson, refreshItems, team } = useApp();
  const [activeId, setActiveId] = React.useState(null);

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;
      const newStatus = String(over.id);
      if (!['backlog', 'todo', 'in_progress', 'in_review', 'done'].includes(newStatus)) return;
      const itemId = active.id;
      if (!itemId || items.every((i) => i.id !== itemId)) return;
      try {
        await fetchJson(`/items/${itemId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        refreshItems();
        if (newStatus === 'done') triggerConfetti();
      } catch (e) {
        console.error(e);
      }
    },
    [fetchJson, refreshItems, items]
  );

  const itemsByStatus = React.useMemo(() => {
    const map = { backlog: [], todo: [], in_progress: [], in_review: [], done: [] };
    items.forEach((i) => {
      if (map[i.status]) map[i.status].push(i);
    });
    return map;
  }, [items]);

  const activeItem = activeId && typeof activeId === 'string' && activeId.length > 36
    ? items.find((i) => i.id === activeId)
    : null;
  const activeCol = activeItem ? COLUMNS.find((c) => c.key === activeItem.status) : null;

  if (!selectedSprintId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ color: 'var(--fog)' }}>
        Select a voyage (sprint) from the sidebar to see the War Room.
      </div>
    );
  }

  return (
    <DndContext onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="flex gap-3.5 overflow-x-auto overflow-y-auto p-5 px-7 flex-1">
        {COLUMNS.map((col) => (
          <DroppableColumn key={col.key} id={col.key} color={col.color}>
            <div className="flex items-center gap-2 py-2 px-1 text-xs font-semibold" style={{ color: 'var(--snow)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              {col.label}
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--ink4)', color: 'var(--fog)' }}
              >
                {itemsByStatus[col.key]?.length ?? 0}
              </span>
            </div>
            {(itemsByStatus[col.key] || []).map((item) => (
              <DraggableCard
                key={item.id}
                item={item}
                columnColor={col.color}
                onOpen={onOpenItem}
              />
            ))}
            <button
              type="button"
              onClick={() => onAddItem(col.key)}
              className="flex items-center gap-1.5 p-2.5 rounded-[var(--r)] text-xs transition-all border border-dashed"
              style={{ color: 'var(--fog)', borderColor: 'var(--border2)' }}
            >
              ＋ Drop Anchor
            </button>
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem && activeCol ? (
          <div className="w-[260px]">
            <Card item={activeItem} columnColor={activeCol.color} isDrag />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
