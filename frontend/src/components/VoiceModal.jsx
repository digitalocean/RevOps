import React, { useState, useRef } from 'react';

export default function VoiceModal({ open, onClose, onSubmit }) {
  const [transcript, setTranscript] = useState('');
  const [type, setType] = useState('note');
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTranscript('[Recording saved — paste transcript or use Create with AI]');
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRecorder.current = rec;
      setRecording(true);
    } catch (e) {
      setTranscript('Microphone access denied. Type your note below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    setRecording(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9990]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[380px] rounded-[20px] p-9 text-center border border-[var(--border2)]"
        style={{ background: 'var(--ink2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-fraunces font-semibold text-xl mb-1" style={{ color: 'var(--white)' }}>
          🎙 Voice Log
        </h2>
        <p className="text-xs mb-6" style={{ color: 'var(--fog)' }}>
          Speak freely — Helm will transcribe and create stories, notes, or log entries
        </p>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl cursor-pointer transition-all border-2 mx-auto mb-4"
          style={{
            background: recording ? 'rgba(242,95,92,0.3)' : 'radial-gradient(circle, rgba(242,95,92,0.3), rgba(242,95,92,0.05))',
            borderColor: recording ? 'var(--rose)' : 'rgba(242,95,92,0.4)',
          }}
        >
          🎙
        </button>
        <div
          className="rounded-[var(--r)] p-3.5 min-h-[60px] text-left text-[13px] leading-relaxed border border-[var(--border)] mb-4"
          style={{ background: 'var(--ink3)', color: 'var(--mist)' }}
        >
          {recording ? 'Listening…' : transcript || 'Transcript will appear here or type below.'}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Or type your note / story / task here"
          className="w-full rounded-[var(--r)] p-3 text-[13px] bg-[var(--ink3)] border border-[var(--border)] text-[var(--snow)] resize-none outline-none mb-4"
          rows={3}
        />
        <div className="flex gap-2 mb-4">
          {['note', 'story', 'task'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex-1 py-2 px-2.5 rounded-[var(--r2)] text-[11px] cursor-pointer border transition-all"
              style={{
                background: 'var(--ink3)',
                borderColor: type === t ? 'var(--gold)' : 'var(--border)',
                color: type === t ? 'var(--gold2)' : 'var(--mist)',
              }}
            >
              {t === 'note' ? '📝 Log Note' : t === 'story' ? '◎ Create Story' : '✓ Create Task'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSubmit({ transcript, type })}
            className="flex-1 py-2 rounded-[var(--r2)] text-xs font-semibold transition-all"
            style={{ background: 'var(--gold)', color: 'var(--ink)' }}
          >
            ✦ Create with AI
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-[var(--r2)] text-xs text-[var(--fog)] hover:bg-[var(--ink3)]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
