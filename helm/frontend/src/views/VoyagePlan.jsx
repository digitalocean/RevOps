import React from 'react';
import { useApp } from '../context/AppContext';

export default function VoyagePlan({ onOpenItem }) {
  const { items, sprints, selectedSprintId } = useApp();
  const sprint = sprints.find((s) => s.id === selectedSprintId);
  const start = sprint?.start_date ? new Date(sprint.start_date) : new Date();
  const end = sprint?.end_date ? new Date(sprint.end_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) || 14;

  if (!selectedSprintId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ color: 'var(--fog)' }}>
        Select a voyage from the sidebar.
      </div>
    );
  }

  const dayHeaders = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const statusGrad = { todo: 'var(--grad-sky)', in_progress: 'var(--grad-amber)', in_review: 'var(--grad-violet)', done: 'var(--grad-jade)' };

  return (
    <div className="flex-1 overflow-auto p-5 px-7 min-w-[800px]">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--ink2)' }}>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)] w-[200px] sticky left-0 bg-[var(--ink)] z-10">Item</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)] w-20 sticky left-[200px] bg-[var(--ink)] z-10">Points</th>
            <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)] w-20 sticky left-[280px] bg-[var(--ink)] z-10">Assignee</th>
            {dayHeaders.map((d) => (
              <th key={d.toISOString()} className="py-2 px-1 text-[10px] font-mono text-[var(--fog)] border-b border-[var(--border)] min-w-[60px]">
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--ink2)]">
              <td className="py-1 px-3 text-[12px] border-b border-[var(--border)] sticky left-0 bg-[var(--ink)] z-[1]" style={{ color: 'var(--snow)' }}>{item.title}</td>
              <td className="py-1 px-3 font-mono text-[11px] border-b border-[var(--border)] sticky left-[200px] bg-[var(--ink)] z-[1]" style={{ color: 'var(--mist)' }}>{item.points ?? 0}pt</td>
              <td className="py-1 px-3 text-[11px] border-b border-[var(--border)] sticky left-[280px] bg-[var(--ink)] z-[1]" style={{ color: 'var(--mist)' }}>—</td>
              {dayHeaders.map((d) => (
                <td key={d.toISOString()} className="p-1 border-b border-[var(--border)] min-w-[60px] align-top">
                  {item.start_date && new Date(item.start_date).getTime() <= d.getTime() && (!item.end_date || new Date(item.end_date).getTime() >= d.getTime()) && (
                    <div
                      className="h-[22px] rounded flex items-center px-2 text-[10px] font-semibold text-white truncate"
                      style={{ background: statusGrad[item.status] || 'var(--grad-sky)' }}
                    >
                      {item.title}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
