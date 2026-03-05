import React from 'react';
import { useApp } from '../context/AppContext';

export default function PageHeader() {
  const { projects, sprints, selectedProjectId, selectedSprintId } = useApp();
  const project = projects.find((p) => p.id === selectedProjectId);
  const sprint = sprints.find((s) => s.id === selectedSprintId);
  const totalPoints = (sprint?.capacity) || 0;
  const donePoints = 0; // could sum from items where status=done
  const pct = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0;

  return (
    <div className="flex-shrink-0 pt-5 px-7 pb-0">
      <div className="text-[11px] mb-1" style={{ color: 'var(--fog)' }}>
        {project?.name} › {sprint?.name || 'Select a voyage'}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="font-fraunces font-semibold text-2xl tracking-tight" style={{ color: 'var(--white)', letterSpacing: '-0.02em' }}>
          {sprint?.name || 'Sprint'} — {sprint?.goal || 'No goal set'}
        </h1>
        {sprint?.status === 'active' && (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'var(--jade-dim)', border: '1px solid rgba(45,212,160,0.2)', color: 'var(--jade)' }}
          >
            ● Active
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--fog)' }}>
        {sprint?.start_date && sprint?.end_date && (
          <span>📅 {new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
        <div className="flex items-center gap-2">
          <div className="w-[120px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ink4)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: 'var(--grad-done)' }}
            />
          </div>
          <span>{pct}% complete</span>
        </div>
        {totalPoints > 0 && (
          <>
            <span className="font-mono">⚡ {totalPoints}pt capacity</span>
            <span style={{ color: 'var(--jade)' }}>✓ {donePoints}pt done</span>
          </>
        )}
      </div>
    </div>
  );
}
