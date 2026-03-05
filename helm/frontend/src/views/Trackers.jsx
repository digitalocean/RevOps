import React from 'react';
import { useApp } from '../context/AppContext';

export default function Trackers() {
  const { trackers, selectedProjectId } = useApp();
  const [activeTab, setActiveTab] = React.useState(0);

  if (!selectedProjectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ color: 'var(--fog)' }}>
        Select a fleet (project) from the sidebar.
      </div>
    );
  }

  const tabs = trackers.length ? trackers : [
    { id: '1', name: '🪨 Big Rocks', icon: '🪨' },
    { id: '2', name: '🎯 OKRs', icon: '🎯' },
    { id: '3', name: '⚠️ Risk Register', icon: '⚠️' },
  ];

  return (
    <div className="flex-1 overflow-auto p-5 px-7">
      <div className="flex items-center gap-2 border-b border-[var(--border)] mb-4">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(i)}
            className="py-2.5 px-3 text-[12.5px] font-medium border-b-2 -mb-px transition-all"
            style={{
              color: activeTab === i ? 'var(--gold2)' : 'var(--fog)',
              borderBottomColor: activeTab === i ? 'var(--gold)' : 'transparent',
            }}
          >
            {t.name}
          </button>
        ))}
        <button type="button" className="py-2 px-2 text-[var(--fog)] hover:text-[var(--gold2)]">＋</button>
      </div>
      <div className="rounded-[var(--r)] border border-[var(--border)] overflow-hidden" style={{ background: 'var(--ink2)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--ink2)' }}>
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)] pl-4">Initiative / Objective / Risk</th>
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)]">Category</th>
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)]">Priority</th>
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)]">Owner</th>
              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-[var(--fog)] border-b border-[var(--border)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-[var(--ink2)]">
                <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)] pl-4" style={{ color: 'var(--snow)' }}>—</td>
                <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>—</td>
                <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>—</td>
                <td className="py-2.5 px-3 text-[12.5px] border-b border-[var(--border)]" style={{ color: 'var(--mist)' }}>—</td>
                <td className="py-2.5 px-3 border-b border-[var(--border)]">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--sky-dim)', color: 'var(--sky)' }}>○</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
