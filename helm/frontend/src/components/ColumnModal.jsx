import React from 'react';

const COLUMNS = ['Title', 'Type', 'Status', 'Priority', 'Points', 'Assignee', 'Due Date', 'Sprint', 'Labels'];

export default function ColumnModal({ open, onClose }) {
  const [visible, setVisible] = React.useState(COLUMNS.reduce((a, c) => ({ ...a, [c]: true }), {}));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9990]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[340px] rounded-2xl p-6 border border-[var(--border2)]"
        style={{ background: 'var(--ink2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-fraunces font-semibold text-base mb-4" style={{ color: 'var(--white)' }}>
          ⊞ Customize Columns
        </h2>
        <div className="space-y-1">
          {COLUMNS.map((col) => (
            <div
              key={col}
              className="flex items-center gap-2.5 py-2 px-3 rounded-[var(--r2)] text-[12.5px]"
              style={{ background: 'var(--ink3)', color: 'var(--mist)' }}
            >
              <button
                type="button"
                role="switch"
                aria-checked={visible[col]}
                onClick={() => setVisible((v) => ({ ...v, [col]: !v[col] }))}
                className="w-8 h-[18px] rounded-full relative transition-colors"
                style={{ background: visible[col] ? 'var(--gold)' : 'var(--ink4)' }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                  style={{ left: visible[col] ? '16px' : '4px' }}
                />
              </button>
              {col}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="w-full mt-3 py-2 px-3 rounded-[var(--r2)] text-xs border border-dashed transition-all text-[var(--gold2)] hover:bg-[var(--gold-dim)]"
          style={{ borderColor: 'rgba(212,168,83,0.3)' }}
        >
          ＋ Add Custom Field
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-[var(--r2)] text-xs font-medium bg-[var(--ink3)] text-[var(--snow)]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
