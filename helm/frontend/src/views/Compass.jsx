import React from 'react';
import { useApp } from '../context/AppContext';

export default function Compass() {
  const { items, sprints, selectedSprintId } = useApp();
  const sprint = sprints.find((s) => s.id === selectedSprintId);
  const totalPoints = items.reduce((s, i) => s + (i.points ?? 0), 0);
  const donePoints = items.filter((i) => i.status === 'done').reduce((s, i) => s + (i.points ?? 0), 0);
  const blockers = items.filter((i) => i.status === 'backlog' && i.priority === 'critical').length;
  const end = sprint?.end_date ? new Date(sprint.end_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((end - new Date()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="flex-1 overflow-auto p-5 px-7">
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {[
          { label: 'Total Points', value: totalPoints, delta: null },
          { label: 'Points Done', value: donePoints, delta: totalPoints ? `${Math.round((donePoints / totalPoints) * 100)}%` },
          { label: 'Blockers', value: blockers, delta: blockers > 0 ? '↑' : null },
          { label: 'Days Remaining', value: daysLeft, delta: null },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-[var(--r)] p-4 border border-[var(--border)]"
            style={{ background: 'var(--ink2)' }}
          >
            <div className="font-fraunces font-semibold text-[28px]" style={{ color: 'var(--white)', fontVariationSettings: '"opsz" 28' }}>
              {m.value}
            </div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--fog)' }}>{m.label}</div>
            {m.delta && (
              <div className={`text-[11px] font-semibold mt-1.5 ${m.delta === '↑' ? 'text-[var(--rose)]' : 'text-[var(--jade)]'}`}>
                {m.delta}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-[var(--r)] border border-[var(--border)] p-5 mb-4" style={{ background: 'var(--ink2)' }}>
        <h3 className="text-[13px] font-semibold mb-4" style={{ color: 'var(--snow)' }}>
          Burndown — {sprint?.name || 'Sprint'}
        </h3>
        <div className="flex items-end gap-2 h-20">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="flex-1 rounded-t cursor-pointer relative transition-opacity hover:opacity-90"
              style={{
                height: `${20 + Math.random() * 60}%`,
                background: i <= 3 ? 'linear-gradient(180deg, var(--gold), rgba(212,168,83,0.3))' : 'linear-gradient(180deg, var(--jade), rgba(45,212,160,0.2))',
              }}
              title={`Day ${i}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
