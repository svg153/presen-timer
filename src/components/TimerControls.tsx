
import { Play, Pause, SkipForward, RefreshCw, ChevronLeft, Timer, Maximize, X, FastForward, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/i18n';

interface TimerControlsProps {
  isRunning: boolean;
  isLastSection: boolean;
  autoAdvance: boolean;
  toggleTimer: () => void;
  resetSection: () => void;
  nextSection: () => void;
  prevSection: () => void;
  addExtraTime: (seconds: number) => void;
  toggleFullscreen: () => void;
  endPresentation: () => void;
  setAutoAdvance: (enabled: boolean) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onOpenStats: () => void;
}

const TimerControls = ({
  isRunning,
  isLastSection,
  autoAdvance,
  toggleTimer,
  resetSection,
  nextSection,
  prevSection,
  addExtraTime,
  toggleFullscreen,
  endPresentation,
  setAutoAdvance,
  canGoBack,
  canGoForward,
  onOpenStats
}: TimerControlsProps) => {
  const { t } = useI18n();
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
          <span className="sr-only">{t('controls.previous')}</span>
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
        <span className="sr-only">{isRunning ? t('controls.pause') : t('controls.play')}</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={resetSection}
        className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="sr-only">{t('controls.reset')}</span>
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
            <span>{t('controls.end')}</span>
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
            <span className="sr-only">{t('controls.next')}</span>
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
        <span className="sr-only">{t('controls.fullscreen')}</span>
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onOpenStats}
        className="bg-github-subtle border-github-subtle hover:bg-github-subtle/80"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="sr-only">{t('controls.stats')}</span>
      </Button>
      
      <div className="flex items-center gap-2 px-2 h-9 rounded-md border border-github-subtle bg-github-subtle/50">
        <FastForward className="h-4 w-4 text-github-muted" />
        <Switch
          id="auto-advance-runtime"
          checked={autoAdvance}
          onCheckedChange={setAutoAdvance}
          className="scale-90"
        />
        <label
          htmlFor="auto-advance-runtime"
          className="text-xs text-github-muted cursor-pointer select-none"
        >
          {t('controls.auto')}
        </label>
      </div>
    </div>
  );
};

export default TimerControls;
