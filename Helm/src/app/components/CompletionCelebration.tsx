import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface CompletionCelebrationProps {
  trigger: boolean;
  label?: string;
}

export function CompletionCelebration({ trigger, label = 'Item completed!' }: CompletionCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 bg-emerald-400/25" />
      <div
        className="relative flex flex-col items-center gap-3"
        style={{ animation: 'completionFadeIn 0.45s ease-out forwards' }}
      >
        <div className="rounded-full bg-emerald-500 p-5 shadow-xl ring-4 ring-emerald-300/50">
          <Check className="w-14 h-14 text-white stroke-[3]" />
        </div>
        <p className="text-xl font-semibold text-emerald-800 bg-white/95 backdrop-blur px-5 py-2.5 rounded-lg shadow-lg border border-emerald-200">
          {label}
        </p>
      </div>
      <style>{`
        @keyframes completionFadeIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
