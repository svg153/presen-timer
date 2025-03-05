
import { Play, Pause, SkipForward, RefreshCw, ChevronLeft, Timer, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimerControlsProps {
  isRunning: boolean;
  isLastSection: boolean;
  toggleTimer: () => void;
  resetSection: () => void;
  nextSection: () => void;
  prevSection: () => void;
  addExtraTime: (seconds: number) => void;
  toggleFullscreen: () => void;
  endPresentation: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const TimerControls = ({
  isRunning,
  isLastSection,
  toggleTimer,
  resetSection,
  nextSection,
  prevSection,
  addExtraTime,
  toggleFullscreen,
  endPresentation,
  canGoBack,
  canGoForward
}: TimerControlsProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4">
      {canGoBack && (
        <Button
          variant="outline"
          size="icon"
          onClick={prevSection}
          className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous Section</span>
        </Button>
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTimer}
        className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
      >
        {isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span className="sr-only">{isRunning ? 'Pause' : 'Play'}</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={resetSection}
        className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="sr-only">Reset</span>
      </Button>
      
      {isLastSection ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addExtraTime(300)} // Add 5 minutes
            className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
          >
            <Timer className="h-4 w-4 mr-2" />
            <span>+5m</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={endPresentation}
            className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
          >
            <X className="h-4 w-4 mr-2" />
            <span>End</span>
          </Button>
        </>
      ) : (
        canGoForward && (
          <Button
            variant="outline"
            size="icon"
            onClick={nextSection}
            className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
          >
            <SkipForward className="h-4 w-4" />
            <span className="sr-only">Next Section</span>
          </Button>
        )
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleFullscreen}
        className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
      >
        <Maximize className="h-4 w-4" />
        <span className="sr-only">Fullscreen</span>
      </Button>
    </div>
  );
};

export default TimerControls;
