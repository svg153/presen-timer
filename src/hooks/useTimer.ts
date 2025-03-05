
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { saveToLocalStorage } from '@/utils/timerUtils';

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
  isFullscreen: boolean;
  isSidebarOpen: boolean;
}

const useTimer = () => {
  const [state, setState] = useState<TimerState>({
    sections: [],
    currentSectionIndex: 0,
    timeRemaining: 0,
    isRunning: false,
    isWarning: false,
    isFullscreen: false,
    isSidebarOpen: true
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.preload = 'auto';
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Timer tick logic
  useEffect(() => {
    if (state.isRunning) {
      timerRef.current = window.setInterval(() => {
        setState(prevState => {
          let newTimeRemaining = prevState.timeRemaining - 1;
          let newCurrentSectionIndex = prevState.currentSectionIndex;
          let newIsWarning = prevState.isWarning;
          
          // Check if section is complete
          if (newTimeRemaining <= 0) {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(err => console.error('Failed to play audio:', err));
            }
            
            // Move to next section if available
            if (newCurrentSectionIndex < prevState.sections.length - 1) {
              newCurrentSectionIndex += 1;
              newTimeRemaining = prevState.sections[newCurrentSectionIndex].duration;
              
              // Show notification
              toast({
                title: "Next Section",
                description: `Now starting: ${prevState.sections[newCurrentSectionIndex].name}`
              });
            } else {
              // End of presentation
              return {
                ...prevState,
                timeRemaining: 0,
                isRunning: false,
                isWarning: false
              };
            }
          }
          
          // Check if we should show warning (30 seconds remaining)
          newIsWarning = newTimeRemaining <= 30 && newTimeRemaining > 0;
          
          return {
            ...prevState,
            timeRemaining: newTimeRemaining,
            currentSectionIndex: newCurrentSectionIndex,
            isWarning: newIsWarning
          };
        });
      }, 1000);
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
  }, [state.isRunning]);
  
  // Set sections
  const setSections = useCallback((newSections: TimerSection[]) => {
    setState(prev => {
      const updatedState = {
        ...prev,
        sections: newSections,
        currentSectionIndex: 0,
        timeRemaining: newSections.length > 0 ? newSections[0].duration : 0,
        isRunning: false,
        isWarning: false
      };
      
      // Save to localStorage
      saveToLocalStorage(newSections);
      
      return updatedState;
    });
  }, []);
  
  // Start/pause timer
  const toggleTimer = useCallback(() => {
    setState(prev => {
      if (prev.sections.length === 0) return prev;
      
      return {
        ...prev,
        isRunning: !prev.isRunning
      };
    });
  }, []);
  
  // Reset current section
  const resetSection = useCallback(() => {
    setState(prev => {
      if (prev.sections.length === 0) return prev;
      
      return {
        ...prev,
        timeRemaining: prev.sections[prev.currentSectionIndex].duration,
        isRunning: false,
        isWarning: false
      };
    });
  }, []);
  
  // Skip to next section
  const nextSection = useCallback(() => {
    setState(prev => {
      if (prev.sections.length === 0 || prev.currentSectionIndex >= prev.sections.length - 1) {
        return prev;
      }
      
      const newIndex = prev.currentSectionIndex + 1;
      
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.error('Failed to play audio:', err));
      }
      
      return {
        ...prev,
        currentSectionIndex: newIndex,
        timeRemaining: prev.sections[newIndex].duration,
        isWarning: false
      };
    });
  }, []);
  
  // Go to previous section
  const prevSection = useCallback(() => {
    setState(prev => {
      if (prev.sections.length === 0 || prev.currentSectionIndex <= 0) {
        return prev;
      }
      
      const newIndex = prev.currentSectionIndex - 1;
      
      return {
        ...prev,
        currentSectionIndex: newIndex,
        timeRemaining: prev.sections[newIndex].duration,
        isWarning: false
      };
    });
  }, []);
  
  // Jump to specific section
  const jumpToSection = useCallback((index: number) => {
    setState(prev => {
      if (index < 0 || index >= prev.sections.length) return prev;
      
      return {
        ...prev,
        currentSectionIndex: index,
        timeRemaining: prev.sections[index].duration,
        isWarning: false,
        isRunning: false
      };
    });
  }, []);
  
  // Add extra time to current section
  const addExtraTime = useCallback((seconds: number) => {
    setState(prev => ({
      ...prev,
      timeRemaining: prev.timeRemaining + seconds
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
  
  // End presentation
  const endPresentation = useCallback(() => {
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
    endPresentation
  };
};

export default useTimer;
