import React from 'react';
import { useApp } from '../context/AppContext';

const NAV = [
  { id: 'war-room', label: 'War Room', icon: '🗺️' },
  { id: 'manifest', label: 'Manifest', icon: '📋' },
  { id: 'voyage-plan', label: 'Voyage Plan', icon: '🗓️' },
  { id: 'trackers', label: 'Trackers', icon: '📊' },
  { id: 'compass', label: 'Compass', icon: '📡' },
];

export default function Sidebar({ onNewProject, onNewSprint }) {
  const { projects, sprints, selectedView, selectedSprintId, selectedProjectId, team, dispatch } = useApp();

  return (
    <aside
      className="w-[220px] flex-shrink-0 overflow-y-auto overflow-x-hidden flex flex-col"
      style={{ background: 'var(--ink2)', borderRight: '1px solid var(--border)' }}
    >
      <div className="p-3 pt-4 pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--fog)' }}>
          Navigate
        </div>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', payload: item.id })}
            className="w-full flex items-center gap-2 py-[7px] px-2.5 rounded-[var(--r2)] text-[12.5px] font-medium transition-all duration-150"
            style={{
              color: selectedView === item.id ? 'var(--gold2)' : 'var(--fog)',
              background: selectedView === item.id ? 'var(--gold-dim)' : 'transparent',
            }}
          >
            <span className="w-[18px] text-sm">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-[var(--border)] mx-3" />

      <div className="p-3 pt-2 pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--fog)' }}>
          Voyages
        </div>
        {sprints.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_SELECTED_SPRINT', payload: s.id })}
            className="w-full flex items-center gap-2 py-[7px] px-2.5 rounded-[var(--r2)] text-[12.5px] font-medium transition-all"
            style={{
              color: selectedSprintId === s.id ? 'var(--gold2)' : 'var(--fog)',
              background: selectedSprintId === s.id ? 'var(--gold-dim)' : 'transparent',
            }}
          >
            <span className="w-[18px]">🌊</span>
            {s.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onNewSprint}
          className="w-full flex items-center gap-2 py-[7px] px-2.5 rounded-[var(--r2)] text-[11.5px] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fog)' }}
        >
          <span className="w-[18px]">＋</span>
          New Voyage
        </button>
      </div>

      <div className="h-px bg-[var(--border)] mx-3" />

      <div className="p-3 pt-2 pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--fog)' }}>
          Fleets
        </div>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_SELECTED_PROJECT', payload: p.id })}
            className="w-full flex items-center gap-2 py-[7px] px-2.5 rounded-[var(--r2)] text-[12.5px] font-medium transition-all"
            style={{
              color: selectedProjectId === p.id ? 'var(--gold2)' : 'var(--fog)',
              background: selectedProjectId === p.id ? 'var(--gold-dim)' : 'transparent',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: p.color || '#6366f1' }}
            />
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onNewProject}
          className="w-full flex items-center gap-2 py-[7px] px-2.5 rounded-[var(--r2)] text-[11.5px] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fog)' }}
        >
          <span className="w-[18px]">＋</span>
          New Fleet
        </button>
      </div>

      <div className="mt-auto border-t border-[var(--border)] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5" style={{ color: 'var(--fog)' }}>
          Crew
        </div>
        {team.slice(0, 5).map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-1 px-2 text-xs" style={{ color: 'var(--fog)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color || '#6366f1' }} />
            {m.name} {m.role ? `· ${String(m.role).slice(0, 2)}` : ''}
          </div>
        ))}
        <button type="button" className="text-xs mt-1 px-2 opacity-60 hover:opacity-100" style={{ color: 'var(--fog)' }}>
          ＋ Add Crew
        </button>
      </div>
    </aside>
  );
}
