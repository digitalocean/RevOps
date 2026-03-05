import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AddItemModal({ open, defaultStatus, onClose }) {
  const { team, selectedProjectId, selectedSprintId, fetchJson, refreshItems } = useApp();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('task');
  const [status, setStatus] = useState(defaultStatus || 'backlog');
  const [priority, setPriority] = useState('medium');
  const [points, setPoints] = useState(1);
  const [assignee_id, setAssigneeId] = useState('');
  const [due_date, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await fetchJson('/items', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          sprint_id: selectedSprintId,
          type,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          points: Number(points) || 1,
          assignee_id: assignee_id || null,
          end_date: due_date || null,
        }),
      });
      refreshItems();
      onClose();
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9990]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[500px] max-h-[90vh] overflow-y-auto rounded-[var(--r)] p-6 border border-[var(--border2)]"
        style={{ background: 'var(--ink2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-fraunces font-semibold text-xl mb-4" style={{ color: 'var(--white)' }}>
          ⚓ Drop Anchor
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium mb-1" style={{ color: 'var(--snow)' }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[var(--r2)] px-3 py-2 text-[13px] outline-none border transition-colors"
              style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', color: 'var(--snow)' }}
              placeholder="Work item title"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              >
                <option value="task">Task</option>
                <option value="story">Story</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">On Deck</option>
                <option value="in_progress">Full Sail</option>
                <option value="in_review">On Review</option>
                <option value="done">Anchored</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Points</label>
              <input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value) || 0)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Assignee</label>
              <select
                value={assignee_id}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Due Date</label>
              <input
                type="date"
                value={due_date}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border"
                style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fog)' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[var(--r2)] px-3 py-2 text-[12px] outline-none border resize-none"
              style={{ background: 'var(--ink3)', borderColor: 'var(--border)', color: 'var(--snow)' }}
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-[var(--r2)] text-xs font-semibold transition-all"
              style={{ background: 'var(--gold)', color: 'var(--ink)' }}
            >
              ⚓ Drop Anchor
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-[var(--r2)] text-xs text-[var(--fog)]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
