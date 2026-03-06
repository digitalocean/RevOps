import { useState } from 'react';
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

interface SummitBoardKanbanProps {
  initiatives: Initiative[];
  crew: { id: string; name: string }[];
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [updating, setUpdating] = useState(false);

  const getInitiativesForColumn = (columnId: string) => {
    const col = COLUMNS.find((c) => c.id === columnId);
    if (!col) return [];
    return initiatives.filter((i) => STATUS_TO_COLUMN[i.status] === columnId);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(columnId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    if (!id) return;
    const initiative = initiatives.find((i) => i.id === id);
    if (!initiative || STATUS_TO_COLUMN[initiative.status] === targetColumnId) return;
    const newStatus = COLUMN_TO_STATUS[targetColumnId];
    if (!newStatus) return;
    setUpdating(true);
    try {
      await onUpdateStatus(id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className={`flex-shrink-0 w-72 rounded-lg border-2 transition-colors ${
              dragOverCol === col.id ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div
              className="px-3 py-2 rounded-t-lg text-sm font-semibold text-white"
              style={{ backgroundColor: col.color }}
            >
              {col.label}
              <span className="ml-2 opacity-90">
                {getInitiativesForColumn(col.id).length}
              </span>
            </div>
            <div className="p-2 space-y-2 min-h-[320px]">
              {getInitiativesForColumn(col.id).map((init) => (
                <div
                  key={init.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, init.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedInitiative(init)}
                  className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    draggedId === init.id ? 'opacity-50' : ''
                  } ${updating ? 'pointer-events-none' : ''}`}
                >
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{init.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{init.priority}</span>
                    {init.isBigRock && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        Big Rock
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedInitiative && (
        <InitiativeDetailsDialog
          initiative={selectedInitiative}
          crew={crew}
          onClose={() => setSelectedInitiative(null)}
          onSave={async (id, payload) => {
            await onUpdateItem(id, payload);
            setSelectedInitiative(null);
          }}
          onDelete={onDeleteItem ? async (id) => {
            await onDeleteItem(id);
            setSelectedInitiative(null);
          } : undefined}
        />
      )}
    </div>
  );
}
