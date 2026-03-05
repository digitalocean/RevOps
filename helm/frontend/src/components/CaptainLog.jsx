import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function CaptainLog({ open, onClose, onVoiceClick }) {
  const { logEntries, selectedSprintId, fetchJson, refreshLog, dispatch } = useApp();
  const [text, setText] = useState('');

  const handleLog = async () => {
    if (!text.trim()) return;
    try {
      const entry = await fetchJson('/log', {
        method: 'POST',
        body: JSON.stringify({
          sprint_id: selectedSprintId,
          content: text.trim(),
          entry_type: 'note',
        }),
      });
      dispatch({ type: 'ADD_LOG_ENTRY', payload: entry });
      setText('');
      refreshLog();
    } catch (e) {
      console.error(e);
    }
  };

  if (!open) return null;

  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-out"
      style={{ width: 'var(--captains-log)', background: 'var(--ink2)', borderLeft: '1px solid var(--border)' }}
    >
      <div className="p-4 pb-3 border-b border-[var(--border)] flex items-center gap-2">
        <span className="font-fraunces font-semibold text-sm" style={{ color: 'var(--white)' }}>
          ⚓ Captain's Log
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--fog)' }}>
          {new Date().toLocaleDateString()}
        </span>
        <button type="button" onClick={onClose} className="text-[var(--fog)] cursor-pointer hover:opacity-80">
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {logEntries.map((e) => (
          <div key={e.id} className="mb-3">
            <div className="font-mono text-[10px] mb-1" style={{ color: 'var(--fog)' }}>
              {new Date(e.created_at).toLocaleString()}
            </div>
            <div
              className="rounded-[var(--r2)] p-2.5 pl-3 text-[12.5px] leading-relaxed"
              style={{
                background: 'var(--ink3)',
                color: 'var(--mist)',
                borderLeft: `2px solid ${e.entry_type === 'voice' ? 'var(--rose)' : e.entry_type === 'ai' ? 'var(--violet)' : 'var(--gold)'}`,
              }}
            >
              {e.entry_type === 'voice' && <span className="text-[9px] font-semibold text-[var(--rose)] block mb-1">🎙 Voice note</span>}
              {e.entry_type === 'ai' && <span className="text-[9px] font-semibold text-[var(--violet)] block mb-1">✦ AI-generated from voice</span>}
              {e.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-[var(--border)] flex-shrink-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a log entry..."
          className="w-full rounded-[var(--r2)] p-2 text-xs resize-none outline-none transition-colors"
          style={{
            background: 'var(--ink3)',
            border: '1px solid var(--border2)',
            color: 'var(--snow)',
            fontFamily: 'DM Sans',
          }}
          rows={2}
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={handleLog}
            className="flex-1 py-2 rounded-[var(--r2)] text-xs font-semibold transition-all"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            ＋ Log it
          </button>
          <button
            type="button"
            onClick={onVoiceClick}
            className="py-2 px-3 rounded-[var(--r2)] text-xs font-semibold transition-all"
            style={{ background: 'var(--rose-dim)', border: '1px solid rgba(242,95,92,0.2)', color: 'var(--rose)' }}
          >
            🎙 Voice
          </button>
        </div>
      </div>
    </aside>
  );
}
