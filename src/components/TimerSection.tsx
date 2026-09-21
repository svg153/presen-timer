
import { formatTime } from '@/utils/timerUtils';
import TimerControls from './TimerControls';
import ProgressBar from './ProgressBar';

interface TimerSectionProps {
  name: string;
  timeRemaining: number;
  isWarning: boolean;
  isOvertime: boolean;
  isRunning: boolean;
  isLastSection: boolean;
  progress: number;
  toggleTimer: () => void;
  resetSection: () => void;
  nextSection: () => void;
  prevSection: () => void;
  addExtraTime: (seconds: number) => void;
  toggleFullscreen: () => void;
  endPresentation: () => void;
  autoAdvance: boolean;
  setAutoAdvance: (enabled: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const TimerSection = ({
  name,
  timeRemaining,
  isWarning,
  isOvertime,
  isRunning,
  isLastSection,
  progress,
  toggleTimer,
  resetSection,
  nextSection,
  prevSection,
  addExtraTime,
  toggleFullscreen,
  endPresentation,
  autoAdvance,
  setAutoAdvance,
  canGoBack,
  canGoForward
}: TimerSectionProps) => {
  const timeClass = isOvertime
    ? 'text-red-500'
    : isWarning
      ? 'text-amber-400'
      : 'text-github-light';
  
  return (
    <div className="glass-card py-8 px-6 max-w-2xl w-full mx-auto animate-fade-in">
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-xl font-medium mb-2 text-github-light">{name}</h2>
        
        <div className="mb-6 w-full">
          <ProgressBar progress={progress} warning={isWarning} />
        </div>
        
        <div className={`timer-text text-6xl md:text-8xl mb-6 ${timeClass} ${isWarning && !isOvertime ? 'animate-pulse' : ''} transition-colors duration-300`}>
          {formatTime(timeRemaining)}
        </div>
        
        <TimerControls
          isRunning={isRunning}
          isLastSection={isLastSection}
          autoAdvance={autoAdvance}
          toggleTimer={toggleTimer}
          resetSection={resetSection}
          nextSection={nextSection}
          prevSection={prevSection}
          addExtraTime={addExtraTime}
          toggleFullscreen={toggleFullscreen}
          endPresentation={endPresentation}
          setAutoAdvance={setAutoAdvance}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
      </div>
    </div>
  );
};

export default TimerSection;
