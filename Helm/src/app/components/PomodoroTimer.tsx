import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, SkipForward, X, Coffee, Zap, Volume2 } from 'lucide-react';

type Phase = 'work' | 'break' | 'long_break';

const PHASE_DURATIONS: Record<Phase, number> = {
  work: 25 * 60,
  break: 5 * 60,
  long_break: 15 * 60,
};

const PHASE_LABELS: Record<Phase, string> = {
  work: 'Focus',
  break: 'Short Break',
  long_break: 'Long Break',
};

const PHASE_COLORS: Record<Phase, { bg: string; text: string; ring: string; progress: string }> = {
  work: { bg: 'bg-indigo-600', text: 'text-indigo-600', ring: 'ring-indigo-200', progress: '#6366f1' },
  break: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200', progress: '#10b981' },
  long_break: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-200', progress: '#3b82f6' },
};

interface PomodoroTimerProps {
  taskName?: string;
  onClose: () => void;
  onLogTime?: (minutes: number) => void;
}

export function PomodoroTimer({ taskName, onClose, onLogTime }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(PHASE_DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [pomosCompleted, setPomosCompleted] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const totalTime = PHASE_DURATIONS[phase];
  const progress = (timeLeft / totalTime) * 100;
  const colors = PHASE_COLORS[phase];

  const playSound = (type: 'ding' | 'tick') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'ding') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {}
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            playSound('ding');
            setRunning(false);
            if (phase === 'work') {
              const nextPomos = pomosCompleted + 1;
              setPomosCompleted(nextPomos);
              setSessionMinutes(m => m + 25);
              const nextPhase: Phase = nextPomos % 4 === 0 ? 'long_break' : 'break';
              setPhase(nextPhase);
              setTimeLeft(PHASE_DURATIONS[nextPhase]);
            } else {
              setPhase('work');
              setTimeLeft(PHASE_DURATIONS.work);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, pomosCompleted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const skip = () => {
    setRunning(false);
    if (phase === 'work') {
      const next: Phase = pomosCompleted % 3 === 0 ? 'long_break' : 'break';
      setPhase(next);
      setTimeLeft(PHASE_DURATIONS[next]);
    } else {
      setPhase('work');
      setTimeLeft(PHASE_DURATIONS.work);
    }
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(PHASE_DURATIONS[phase]);
  };

  // SVG circle progress
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`${colors.bg} px-4 py-3 flex items-center justify-between text-white`}>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-semibold">Focus Timer</span>
        </div>
        <div className="flex items-center gap-2">
          {sessionMinutes > 0 && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{sessionMinutes}m logged</span>
          )}
          <button onClick={onClose} className="p-0.5 rounded hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Task name */}
        {taskName && (
          <p className="text-xs text-gray-500 text-center mb-3 truncate px-2">
            <span className="font-medium text-gray-700">{taskName}</span>
          </p>
        )}

        {/* Phase tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5">
          {(['work', 'break', 'long_break'] as Phase[]).map(p => (
            <button
              key={p}
              onClick={() => { setPhase(p); setTimeLeft(PHASE_DURATIONS[p]); setRunning(false); }}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
                phase === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'work' ? '🎯 Focus' : p === 'break' ? '☕ Break' : '🌙 Long'}
            </button>
          ))}
        </div>

        {/* Circular timer */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle
                cx="80" cy="80" r={radius}
                fill="none"
                stroke={colors.progress}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-gray-400 mt-0.5">{PHASE_LABELS[phase]}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-xs font-mono"
            title="Reset"
          >
            ↺
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`w-14 h-14 rounded-full ${colors.bg} text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-all active:scale-95`}
          >
            {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button
            onClick={skip}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title="Skip phase"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Pomodoros */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < (pomosCompleted % 4) ? 'bg-indigo-500 scale-110' : 'bg-gray-200'
              }`}
            />
          ))}
          {pomosCompleted > 0 && (
            <span className="text-xs text-gray-400 ml-1">{pomosCompleted} done</span>
          )}
        </div>

        {/* Log time button */}
        {sessionMinutes > 0 && onLogTime && (
          <button
            onClick={() => { onLogTime(sessionMinutes); setSessionMinutes(0); }}
            className="w-full mt-3 py-2 text-xs text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors font-medium flex items-center justify-center gap-1.5"
          >
            <Timer className="w-3.5 h-3.5" />
            Log {sessionMinutes}m to task
          </button>
        )}
      </div>
    </div>
  );
}
