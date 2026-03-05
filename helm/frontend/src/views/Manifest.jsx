import React from 'react';
import { useApp } from '../context/AppContext';

const STATUS_OPTIONS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const STATUS_LABELS = { backlog: '○ Backlog', todo: '● On Deck', in_progress: '◉ Full Sail', in_review: '◐ On Review', done: '✓ Anchored' };
const STATUS_CLASS = {
  backlog: 'bg-[var(--ink3)] text-[var(--fog)]',
  todo: 'bg-[var(--sky-dim)] text-[var(--sky)]',
  in_progress: 'bg-[var(--amber-dim)] text-[var(--amber)]',
  in_review: 'bg-[var(--violet-dim)] text-[var(--violet)]',
  done: 'bg-[var(--jade-dim)] text-[var(--jade)]',
};

export default function Manifest({ onOpenItem, onAddItem }) {
  const { items, selectedSprintId } = useApp();

  if (!selectedSprintId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ color: 'var(--fog)' }}>
        Select a voyage from the sidebar.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-5 px-7">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--ink2)' }}>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)] whitespace-nowrap pl-4">Title</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Type</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Status</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Priority</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Points</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Assignee</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--fog)] border-b border-[var(--border)]">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-[var(--ink2)] transition-colors cursor-pointer"
              onClick={() => onOpenItem(item)}
            >
              <td className="py-2.5 px-3 text-[12.5px] font-medium border-b border-[var(--border)] pl-4" style={{ color: 'var(--snow)' }}>{item.title}</td>
              <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>{item.type}</td>
              <td className="py-2.5 px-3 border-b border-[var(--border)]">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_CLASS[item.status] || ''}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </td>
              <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>{item.priority}</td>
              <td className="py-2.5 px-3 font-mono text-[12px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>{item.points ?? 0}pt</td>
              <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>—</td>
              <td className="py-2.5 px-3 font-mono text-[11px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>{item.end_date ? new Date(item.end_date).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => onAddItem()}
        className="w-full flex items-center gap-2 py-2.5 px-4 text-xs border-b border-[var(--border)] transition-all hover:bg-[var(--ink2)] hover:text-[var(--gold2)]"
        style={{ color: 'var(--fog)' }}
      >
        ＋ Drop Anchor — Add new work item
      </button>
    </div>
  );
}
