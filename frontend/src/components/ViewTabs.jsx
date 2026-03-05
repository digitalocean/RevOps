import React from 'react';
import { useApp } from '../context/AppContext';

const TABS = [
  { id: 'war-room', label: 'War Room', icon: '🗺️' },
  { id: 'manifest', label: 'Manifest', icon: '📋' },
  { id: 'voyage-plan', label: 'Voyage Plan', icon: '🗓️' },
  { id: 'trackers', label: 'Trackers', icon: '📊' },
  { id: 'compass', label: 'Compass', icon: '📡' },
];

export default function ViewTabs({ onColumnsClick, onAddItem }) {
  const { selectedView, dispatch } = useApp();

  return (
    <div
      className="flex items-center px-7 border-b flex-shrink-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: tab.id })}
          className="py-2.5 px-3.5 text-[12.5px] font-medium cursor-pointer border-b-2 border-transparent -mb-px transition-all duration-150"
          style={{
            color: selectedView === tab.id ? 'var(--gold2)' : 'var(--fog)',
            borderBottomColor: selectedView === tab.id ? 'var(--gold)' : 'transparent',
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1.5 py-1.5">
        <button
          type="button"
          onClick={onColumnsClick}
          className="px-2 py-1.5 rounded-[var(--r2)] text-xs font-medium transition-all"
          style={{ color: 'var(--fog)' }}
        >
          ⊞ Columns
        </button>
        <button
          type="button"
          onClick={onAddItem}
          className="px-3.5 py-1.5 rounded-[var(--r2)] text-xs font-semibold transition-all"
          style={{ background: 'var(--gold)', color: 'var(--ink)' }}
        >
          ＋ Drop Anchor
        </button>
      </div>
    </div>
  );
}
