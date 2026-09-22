import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { saveToLocalStorage, secondsLeftFromEnd } from '@/utils/timerUtils';
import { PresentationStats } from '@/utils/statsUtils';
import { playNotificationSound, unlockAudio, type SoundPreferences } from '@/utils/soundUtils';
import useWakeLock from '@/hooks/useWakeLock';

export interface TimerSection {
  name: string;
  duration: number; // in seconds
}

interface TimerState {
  sections: TimerSection[];
  currentSectionIndex: number;
  timeRemaining: number;
  isRunning: boolean;
  isWarning: boolean;
  isOvertime: boolean;
  isFullscreen: boolean;
  isSidebarOpen: boolean;
  autoAdvance: boolean;
  stats: PresentationStats | null;
  presentationEnded: boolean;
}

const WARNING_THRESHOLD = 30;

// Sound preferences come from useSoundSettings; the timer only reads them.
const useTimer = (sound?: SoundPreferences) => {
  const [state, setState] = useState<TimerState>({
    sections: [],
    currentSectionIndex: 0,
    timeRemaining: 0,
    isRunning: false,
    isWarning: false,
    isOvertime: false,
    isFullscreen: false,
    isSidebarOpen: true,
    autoAdvance: true,
    stats: null,
    presentationEnded: false
  });

  // Mirror of state for imperative reads (interval callbacks, actions)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Absolute end timestamp (ms) for the current section while running.
  // The countdown is derived from Date.now() so it never drifts,
  // even with throttled background tabs or irregular interval firing.
  const endAtRef = useRef<number | null>(null);

  // Per-section actual-time recorder: wall-clock seconds spent RUNNING,
  // accumulated per section index. statsStartRef marks the open segment
  // of the current section (null while paused).
  const statsElapsedRef = useRef<number[]>([]);
  const statsStartRef = useRef<number | null>(null);

  // Close the open segment into the accumulator for the current section.
  const flushStats = () => {
    const startedAt = statsStartRef.current;
    if (startedAt === null) return;
    const idx = stateRef.current.currentSectionIndex;
    statsElapsedRef.current[idx] = (statsElapsedRef.current[idx] ?? 0) + (Date.now() - startedAt) / 1000;
    statsStartRef.current = null;
  };

  // Snapshot of planned vs actual per section; the still-running segment
  // counts live without being closed.
  const snapshotStats = (sections: TimerSection[], currentIndex: number): PresentationStats => {
    const startedAt = statsStartRef.current;
    const live = startedAt !== null ? (Date.now() - startedAt) / 1000 : 0;
    return {
      sections: sections.map((s, i) => ({
        name: s.name,
        planned: s.duration,
        actual: Math.round((statsElapsedRef.current[i] ?? 0) + (i === currentIndex ? live : 0))
      })),
      endedAt: Date.now()
    };
  };

  const timerRef = useRef<number | null>(null);

  // Keep the screen awake while the timer runs (released on pause/stop).
  useWakeLock(state.isRunning);

  // Latest sound preferences for playNotification, which must stay stable
  // across renders. The effect keys on primitives because the caller passes a
  // new object identity on every render.
  const muted = sound?.muted ?? false;
  const volume = sound?.volume ?? 1;
  const soundRef = useRef<SoundPreferences>({ muted, volume });
  useEffect(() => {
    soundRef.current = { muted, volume };
  }, [muted, volume]);

  const playNotification = useCallback(() => {
    playNotificationSound(soundRef.current);
  }, []);

  // Timer tick: derive remaining seconds from the end timestamp
  useEffect(() => {
    if (state.isRunning) {
      timerRef.current = window.setInterval(() => {
        const endAt = endAtRef.current;
        if (endAt === null) return;

        const secondsLeft = secondsLeftFromEnd(endAt, Date.now());
        const prev = stateRef.current;

        if (secondsLeft > 0) {
          // Avoid re-renders while the displayed second hasn't changed
          if (secondsLeft === prev.timeRemaining) return;

          setState({
            ...prev,
            timeRemaining: secondsLeft,
            isWarning: secondsLeft <= WARNING_THRESHOLD,
            isOvertime: false
          });
          return;
        }

        // Section time is up
        if (prev.autoAdvance && prev.currentSectionIndex < prev.sections.length - 1) {
          playNotification();

          flushStats();
          const nextIndex = prev.currentSectionIndex + 1;
          const nextDuration = prev.sections[nextIndex].duration;

          endAtRef.current = Date.now() + nextDuration * 1000;
          statsStartRef.current = Date.now();

          toast({
            title: "Next Section",
            description: `Now starting: ${prev.sections[nextIndex].name}`
          });

          setState({
            ...prev,
            currentSectionIndex: nextIndex,
            timeRemaining: nextDuration,
            isWarning: nextDuration <= WARNING_THRESHOLD,
            isOvertime: false,
            stats: snapshotStats(prev.sections, nextIndex)
          });
        } else if (prev.autoAdvance) {
          // End of presentation
          playNotification();
          endAtRef.current = null;
          flushStats();
          setState({
            ...prev,
            timeRemaining: 0,
            isRunning: false,
            isWarning: false,
            isOvertime: false,
            stats: snapshotStats(prev.sections, prev.currentSectionIndex),
            presentationEnded: true
          });
        } else {
          // Overtime: keep counting down into negative so the speaker
          // can see how much they have overrun; advance manually.
          // Derived from the original end timestamp so the cadence stays 1s/s.
          const overtimeSeconds = Math.floor((Date.now() - endAt) / 1000);
          const displayed = -overtimeSeconds;
          if (displayed === prev.timeRemaining) return;

          if (prev.timeRemaining >= 0) playNotification();

          setState({
            ...prev,
            timeRemaining: displayed,
            isOvertime: true
          });
        }
      }, 250);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isRunning, playNotification]);
  
  // Set sections
  const setSections = useCallback((newSections: TimerSection[]) => {
    endAtRef.current = null;
    statsElapsedRef.current = [];
    statsStartRef.current = null;
    saveToLocalStorage(newSections);

    setState(prev => ({
      ...prev,
      sections: newSections,
      currentSectionIndex: 0,
      timeRemaining: newSections.length > 0 ? newSections[0].duration : 0,
      isRunning: false,
      isWarning: false,
      isOvertime: false,
      stats: null,
      presentationEnded: false
    }));
  }, []);
  
  // Start/pause timer
  const toggleTimer = useCallback(() => {
    const prev = stateRef.current;
    if (prev.sections.length === 0) return;

    if (prev.isRunning) {
      // Pause: freeze the remaining time from the end timestamp.
      // In overtime this keeps the negative value so the overrun is preserved.
      const endAt = endAtRef.current;
      const remaining = endAt !== null
        ? Math.floor((endAt - Date.now()) / 1000)
        : prev.timeRemaining;
      endAtRef.current = null;
      flushStats();
      setState({
        ...prev,
        isRunning: false,
        timeRemaining: remaining,
        isWarning: remaining > 0 && remaining <= WARNING_THRESHOLD,
        stats: snapshotStats(prev.sections, prev.currentSectionIndex)
      });
    } else {
      // Starting after a finished presentation begins a fresh run:
      // clear the accumulated per-section time.
      if (prev.presentationEnded) statsElapsedRef.current = [];
      // Browsers only allow audio after a gesture: open the context here so the
      // chime can sound later, when a section ends on its own.
      unlockAudio();
      // Resume: derive a fresh end timestamp from the remaining time
      endAtRef.current = Date.now() + prev.timeRemaining * 1000;
      statsStartRef.current = Date.now();
      setState({
        ...prev,
        isRunning: true,
        presentationEnded: false
      });
    }
  }, []);
  
  // Reset current section
  const resetSection = useCallback(() => {
    const prev = stateRef.current;
    if (prev.sections.length === 0) return;

    endAtRef.current = null;
    // The section restarts: discard its open segment and accumulated time.
    statsStartRef.current = null;
    statsElapsedRef.current[prev.currentSectionIndex] = 0;
    setState({
      ...prev,
      timeRemaining: prev.sections[prev.currentSectionIndex].duration,
      isRunning: false,
      isWarning: false,
      isOvertime: false,
      stats: snapshotStats(prev.sections, prev.currentSectionIndex)
    });
  }, []);
  
  // Skip to next section
  const nextSection = useCallback(() => {
    const prev = stateRef.current;
    if (prev.sections.length === 0 || prev.currentSectionIndex >= prev.sections.length - 1) {
      return;
    }
    
    const newIndex = prev.currentSectionIndex + 1;
    const newDuration = prev.sections[newIndex].duration;

    playNotification();
    flushStats();
    endAtRef.current = prev.isRunning ? Date.now() + newDuration * 1000 : null;
    if (prev.isRunning) statsStartRef.current = Date.now();

    setState({
      ...prev,
      currentSectionIndex: newIndex,
      timeRemaining: newDuration,
      isWarning: false,
      isOvertime: false,
      stats: snapshotStats(prev.sections, newIndex)
    });
  }, [playNotification]);
  
  // Go to previous section
  const prevSection = useCallback(() => {
    const prev = stateRef.current;
    if (prev.sections.length === 0 || prev.currentSectionIndex <= 0) {
      return;
    }
    
    const newIndex = prev.currentSectionIndex - 1;
    const newDuration = prev.sections[newIndex].duration;

    flushStats();
    endAtRef.current = prev.isRunning ? Date.now() + newDuration * 1000 : null;
    if (prev.isRunning) statsStartRef.current = Date.now();

    setState({
      ...prev,
      currentSectionIndex: newIndex,
      timeRemaining: newDuration,
      isWarning: false,
      isOvertime: false,
      stats: snapshotStats(prev.sections, newIndex)
    });
  }, []);
  
  // Jump to specific section
  const jumpToSection = useCallback((index: number) => {
    const prev = stateRef.current;
    if (index < 0 || index >= prev.sections.length) return;

    flushStats();
    endAtRef.current = null;
    setState({
      ...prev,
      currentSectionIndex: index,
      timeRemaining: prev.sections[index].duration,
      isWarning: false,
      isOvertime: false,
      isRunning: false,
      stats: snapshotStats(prev.sections, index)
    });
  }, []);
  
  // Add extra time to current section
  const addExtraTime = useCallback((seconds: number) => {
    const prev = stateRef.current;
    if (prev.isRunning && endAtRef.current !== null) {
      endAtRef.current += seconds * 1000;
    }

    setState(p => ({
      ...p,
      timeRemaining: p.timeRemaining + seconds,
      isOvertime: p.timeRemaining + seconds >= 0 ? false : p.isOvertime
    }));
    
    toast({
      title: "Extra Time Added",
      description: `Added ${seconds/60} minutes to the current section`
    });
  }, []);
  
  // Keep isFullscreen in sync with the real document state. The
  // fullscreenchange event is the source of truth: it covers ESC exits,
  // F11 and failed requestFullscreen attempts, which an optimistic
  // setState would desync.
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement !== null;
      setState(prev => (prev.isFullscreen === isFs ? prev : { ...prev, isFullscreen: isFs }));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Toggle fullscreen; isFullscreen is updated by the listener above.
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSidebarOpen: !prev.isSidebarOpen
    }));
  }, []);
  
  // Toggle auto-advance on section end
  const setAutoAdvance = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      autoAdvance: enabled
    }));
  }, []);
  
  // Edit a section's name/duration. Editing the current section's duration
  // resets it to the full new duration (running or paused); name-only edits
  // never affect timing.
  const updateSection = useCallback((index: number, patch: Partial<TimerSection>) => {
    const prev = stateRef.current;
    if (index < 0 || index >= prev.sections.length) return;

    const newSections = prev.sections.map((s, i) =>
      i === index ? { ...s, ...patch } : s
    );
    saveToLocalStorage(newSections);

    if (index === prev.currentSectionIndex && patch.duration !== undefined && patch.duration !== prev.sections[index].duration) {
      const newDuration = patch.duration;
      endAtRef.current = prev.isRunning ? Date.now() + newDuration * 1000 : null;
      setState({
        ...prev,
        sections: newSections,
        timeRemaining: newDuration,
        isWarning: prev.isRunning && newDuration <= WARNING_THRESHOLD,
        isOvertime: false
      });
    } else {
      setState({ ...prev, sections: newSections });
    }
  }, []);

  // Delete a section. Deleting the current one pauses the timer and lands
  // on the section that takes its place (or the previous one if it was last).
  const deleteSection = useCallback((index: number) => {
    const prev = stateRef.current;
    if (index < 0 || index >= prev.sections.length) return;

    const newSections = prev.sections.filter((_, i) => i !== index);
    saveToLocalStorage(newSections);

    if (newSections.length === 0) {
      endAtRef.current = null;
      setState({
        ...prev,
        sections: newSections,
        currentSectionIndex: 0,
        timeRemaining: 0,
        isRunning: false,
        isWarning: false,
        isOvertime: false
      });
      return;
    }

    let newIndex = prev.currentSectionIndex;
    if (index === prev.currentSectionIndex) {
      newIndex = Math.min(index, newSections.length - 1);
    } else if (index < prev.currentSectionIndex) {
      newIndex = prev.currentSectionIndex - 1;
    }

    const wasCurrent = index === prev.currentSectionIndex;
    if (wasCurrent) {
      flushStats();
      endAtRef.current = null;
    }
    // Keep the accumulator aligned with section indices.
    statsElapsedRef.current.splice(index, 1);

    setState({
      ...prev,
      sections: newSections,
      currentSectionIndex: newIndex,
      timeRemaining: wasCurrent ? newSections[newIndex].duration : prev.timeRemaining,
      isRunning: wasCurrent ? false : prev.isRunning,
      isWarning: wasCurrent ? false : prev.isWarning,
      isOvertime: wasCurrent ? false : prev.isOvertime,
      stats: snapshotStats(newSections, newIndex)
    });
  }, []);

  // Move a section up/down. Reordering pauses the timer and resets the
  // current section to its full duration to avoid ambiguous elapsed time.
  const moveSection = useCallback((index: number, direction: -1 | 1) => {
    const prev = stateRef.current;
    const target = index + direction;
    if (index < 0 || index >= prev.sections.length || target < 0 || target >= prev.sections.length) return;

    const newSections = [...prev.sections];
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    saveToLocalStorage(newSections);

    let newIndex = prev.currentSectionIndex;
    if (index === prev.currentSectionIndex) newIndex = target;
    else if (target === prev.currentSectionIndex) newIndex = index;

    flushStats();
    endAtRef.current = null;
    [statsElapsedRef.current[index], statsElapsedRef.current[target]] =
      [statsElapsedRef.current[target], statsElapsedRef.current[index]];

    setState({
      ...prev,
      sections: newSections,
      currentSectionIndex: newIndex,
      timeRemaining: newSections[newIndex].duration,
      isRunning: false,
      isWarning: false,
      isOvertime: false,
      stats: snapshotStats(newSections, newIndex)
    });
  }, []);

  // Append a new section at the end; never interrupts the running timer.
  const addSection = useCallback(() => {
    const prev = stateRef.current;
    const newSection: TimerSection = {
      name: `Section ${prev.sections.length + 1}`,
      duration: 300
    };
    const newSections = [...prev.sections, newSection];
    saveToLocalStorage(newSections);
    setState({ ...prev, sections: newSections });
  }, []);

  // End presentation
  const endPresentation = useCallback(() => {
    endAtRef.current = null;
    flushStats();
    setState(prev => ({
      ...prev,
      isRunning: false,
      stats: snapshotStats(prev.sections, prev.currentSectionIndex),
      presentationEnded: true
    }));
    
    toast({
      title: "Presentation Ended",
      description: "Your presentation has ended"
    });
  }, []);

  return {
    ...state,
    setSections,
    toggleTimer,
    resetSection,
    nextSection,
    prevSection,
    jumpToSection,
    addExtraTime,
    toggleFullscreen,
    toggleSidebar,
    setAutoAdvance,
    endPresentation,
    updateSection,
    deleteSection,
    moveSection,
    addSection
  };
};

export default useTimer;
