import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { saveToLocalStorage, secondsLeftFromEnd } from '@/utils/timerUtils';

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
}

const WARNING_THRESHOLD = 30;

const useTimer = () => {
  const [state, setState] = useState<TimerState>({
    sections: [],
    currentSectionIndex: 0,
    timeRemaining: 0,
    isRunning: false,
    isWarning: false,
    isOvertime: false,
    isFullscreen: false,
    isSidebarOpen: true,
    autoAdvance: true
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(`${import.meta.env.BASE_URL}notification.mp3`);
    audioRef.current.preload = 'auto';
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotification = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error('Failed to play audio:', err));
    }
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

          const nextIndex = prev.currentSectionIndex + 1;
          const nextDuration = prev.sections[nextIndex].duration;

          endAtRef.current = Date.now() + nextDuration * 1000;

          toast({
            title: "Next Section",
            description: `Now starting: ${prev.sections[nextIndex].name}`
          });

          setState({
            ...prev,
            currentSectionIndex: nextIndex,
            timeRemaining: nextDuration,
            isWarning: nextDuration <= WARNING_THRESHOLD,
            isOvertime: false
          });
        } else if (prev.autoAdvance) {
          // End of presentation
          playNotification();
          endAtRef.current = null;
          setState({
            ...prev,
            timeRemaining: 0,
            isRunning: false,
            isWarning: false,
            isOvertime: false
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
    saveToLocalStorage(newSections);

    setState(prev => ({
      ...prev,
      sections: newSections,
      currentSectionIndex: 0,
      timeRemaining: newSections.length > 0 ? newSections[0].duration : 0,
      isRunning: false,
      isWarning: false,
      isOvertime: false
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
      setState({
        ...prev,
        isRunning: false,
        timeRemaining: remaining,
        isWarning: remaining > 0 && remaining <= WARNING_THRESHOLD
      });
    } else {
      // Resume: derive a fresh end timestamp from the remaining time
      endAtRef.current = Date.now() + prev.timeRemaining * 1000;
      setState({
        ...prev,
        isRunning: true
      });
    }
  }, []);
  
  // Reset current section
  const resetSection = useCallback(() => {
    const prev = stateRef.current;
    if (prev.sections.length === 0) return;

    endAtRef.current = null;
    setState({
      ...prev,
      timeRemaining: prev.sections[prev.currentSectionIndex].duration,
      isRunning: false,
      isWarning: false,
      isOvertime: false
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
    endAtRef.current = prev.isRunning ? Date.now() + newDuration * 1000 : null;

    setState({
      ...prev,
      currentSectionIndex: newIndex,
      timeRemaining: newDuration,
      isWarning: false,
      isOvertime: false
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

    endAtRef.current = prev.isRunning ? Date.now() + newDuration * 1000 : null;

    setState({
      ...prev,
      currentSectionIndex: newIndex,
      timeRemaining: newDuration,
      isWarning: false,
      isOvertime: false
    });
  }, []);
  
  // Jump to specific section
  const jumpToSection = useCallback((index: number) => {
    const prev = stateRef.current;
    if (index < 0 || index >= prev.sections.length) return;

    endAtRef.current = null;
    setState({
      ...prev,
      currentSectionIndex: index,
      timeRemaining: prev.sections[index].duration,
      isWarning: false,
      isOvertime: false,
      isRunning: false
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
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
    
    // Implement actual fullscreen logic
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
  
  // End presentation
  const endPresentation = useCallback(() => {
    endAtRef.current = null;
    setState(prev => ({
      ...prev,
      isRunning: false
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
    endPresentation
  };
};

export default useTimer;
