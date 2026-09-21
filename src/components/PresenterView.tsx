import { useEffect, useRef, useState } from 'react';
import { X, Settings2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/utils/timerUtils';

interface PresenterViewProps {
  name: string;
  timeRemaining: number;
  isOvertime: boolean;
  progress: number;
  onExit: () => void;
}

interface Thresholds {
  amberSeconds: number;
  redSeconds: number;
}

const DEFAULT_THRESHOLDS: Thresholds = { amberSeconds: 60, redSeconds: 10 };
const THRESHOLDS_STORAGE_KEY = 'presentation-timer-presenter-thresholds';
const CURSOR_IDLE_MS = 3000;

const loadThresholds = (): Thresholds => {
  try {
    const raw = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw);
    return {
      amberSeconds: Number(parsed.amberSeconds) > 0 ? Number(parsed.amberSeconds) : DEFAULT_THRESHOLDS.amberSeconds,
      redSeconds: Number(parsed.redSeconds) > 0 ? Number(parsed.redSeconds) : DEFAULT_THRESHOLDS.redSeconds
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
};

const PresenterView = ({ name, timeRemaining, isOvertime, progress, onExit }: PresenterViewProps) => {
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds);
  const [showSettings, setShowSettings] = useState(false);
  const [cursorIdle, setCursorIdle] = useState(false);

  const cursorTimerRef = useRef<number | null>(null);

  // Hide the cursor after a few seconds of inactivity (mousemove wakes it).
  useEffect(() => {
    const wake = () => {
      setCursorIdle(false);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = window.setTimeout(() => setCursorIdle(true), CURSOR_IDLE_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    return () => {
      window.removeEventListener('mousemove', wake);
      if (cursorTimerRef.current) window.clearTimeout(cursorTimerRef.current);
    };
  }, []);

  const updateThresholds = (patch: Partial<Thresholds>) => {
    setThresholds(prev => {
      const next = { ...prev, ...patch };
      // Red must stay below amber so the phases stay meaningful.
      if (next.redSeconds >= next.amberSeconds) next.redSeconds = next.amberSeconds - 5;
      try {
        localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal: thresholds just won't persist.
      }
      return next;
    });
  };

  const isRed = isOvertime || timeRemaining <= thresholds.redSeconds;
  const isAmber = !isRed && timeRemaining <= thresholds.amberSeconds;
  const bgColor = isRed ? 'bg-red-600' : isAmber ? 'bg-amber-500' : 'bg-emerald-600';
  const timeClass = isRed ? 'text-white' : 'text-white';

  return (
    <div className={`fixed inset-0 z-[100] ${bgColor} ${cursorIdle ? 'cursor-none' : ''} flex flex-col items-center justify-center transition-colors duration-500 select-none`}>
      <div className="text-[6vh] font-medium text-white/90 mb-[3vh] truncate max-w-[90vw] px-4 text-center">
        {name}
      </div>

      <div className={`timer-text text-[22vh] leading-none font-bold ${timeClass} ${isAmber && !isOvertime ? 'animate-pulse' : ''} transition-colors duration-500`}>
        {formatTime(timeRemaining)}
      </div>

      {/* Overall presentation progress; clamped in overtime */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5vh] bg-black/25">
        <div
          className="h-full bg-white/85 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Minimal chrome, hidden with the cursor */}
      {!cursorIdle && (
        <>
          <button
            onClick={onExit}
            aria-label="Exit presenter mode"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={() => setShowSettings(s => !s)}
            aria-label="Presenter thresholds settings"
            className="absolute top-4 right-16 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          >
            <Settings2 className="h-6 w-6" />
          </button>
          {showSettings && (
            <div className="absolute top-16 right-4 w-72 rounded-lg bg-slate-900/95 p-4 text-white space-y-4 shadow-xl">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Amber at</span>
                  <span className="font-mono">{thresholds.amberSeconds}s</span>
                </div>
                <Slider
                  value={[thresholds.amberSeconds]}
                  min={15}
                  max={120}
                  step={5}
                  onValueChange={([v]) => updateThresholds({ amberSeconds: v })}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Red at</span>
                  <span className="font-mono">{thresholds.redSeconds}s</span>
                </div>
                <Slider
                  value={[thresholds.redSeconds]}
                  min={5}
                  max={60}
                  step={5}
                  onValueChange={([v]) => updateThresholds({ redSeconds: v })}
                />
              </div>
              <p className="text-xs text-white/60">Background turns amber when the section has this much time left, red at the last seconds (and in overtime).</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PresenterView;
