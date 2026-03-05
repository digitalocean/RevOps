import React from 'react';
import { useApp } from '../context/AppContext';

export default function Topbar({ onVoiceClick, onColumnsClick }) {
  const { workspaces, selectedWorkspaceId, dispatch, currentUser } = useApp();

  return (
    <header
      className="flex items-center justify-between px-4 h-[52px] flex-shrink-0 sticky top-0 z-[100]"
      style={{ background: 'var(--ink2)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-lg"
          style={{ background: 'var(--grad-gold)' }}
        >
          ⚓
        </div>
        <span
          className="font-fraunces font-semibold text-[17px] tracking-tight"
          style={{ color: 'var(--white)', letterSpacing: '-0.02em' }}
        >
          Helm
        </span>
        <div className="w-px h-6 mx-1 bg-[var(--border2)]" />
        <div className="flex items-center gap-1">
          {(workspaces.length ? workspaces : [{ id: '1', name: 'RevOps', icon: '⚡' }, { id: '2', name: 'Platform', icon: '🚀' }, { id: '3', name: 'Infra', icon: '🔧' }]).map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_SELECTED_WORKSPACE', payload: w.id })}
              className="px-2 py-1 rounded-[var(--r2)] text-xs font-medium transition-all duration-150"
              style={{
                color: selectedWorkspaceId === w.id ? 'var(--snow)' : 'var(--fog)',
                background: selectedWorkspaceId === w.id ? 'var(--ink3)' : 'transparent',
              }}
            >
              {w.icon} {w.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVoiceClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={{
            background: 'var(--rose-dim)',
            border: '1px solid rgba(242,95,92,0.25)',
            color: 'var(--rose)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" style={{ background: 'var(--rose)' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--rose)' }} />
          </span>
          🎙 Voice Log
        </button>
        <button
          type="button"
          onClick={onColumnsClick}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--r2)] text-xs font-medium transition-all"
          style={{ color: 'var(--fog)' }}
        >
          ⊞ Columns
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {currentUser?.avatar || 'RK'}
        </div>
      </div>
    </header>
  );
}
