import { useEffect, useRef, useState } from 'react';

interface ShortcutHandlers {
  onToggleTimer: () => void;
  onNextSection: () => void;
  onPrevSection: () => void;
  onResetSection: () => void;
  onToggleFullscreen: () => void;
  onAddExtraTime: (seconds: number) => void;
}

interface UseKeyboardShortcutsOptions extends ShortcutHandlers {
  // Shortcuts are only active while a timer exists (definition screen excluded)
  enabled: boolean;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

// Global keyboard shortcuts for the running timer.
// Returns the help-dialog state so the app can render it.
const useKeyboardShortcuts = ({
  onToggleTimer,
  onNextSection,
  onPrevSection,
  onResetSection,
  onToggleFullscreen,
  onAddExtraTime,
  enabled
}: UseKeyboardShortcutsOptions) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Keep handlers in a ref so the key listener binds once
  const handlersRef = useRef<ShortcutHandlers>({
    onToggleTimer,
    onNextSection,
    onPrevSection,
    onResetSection,
    onToggleFullscreen,
    onAddExtraTime
  });
  handlersRef.current = {
    onToggleTimer,
    onNextSection,
    onPrevSection,
    onResetSection,
    onToggleFullscreen,
    onAddExtraTime
  };

  const isHelpOpenRef = useRef(isHelpOpen);
  isHelpOpenRef.current = isHelpOpen;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // While the help dialog is open, only ? toggles it
      if (isHelpOpenRef.current) {
        if (e.key === '?' || e.key === 'Escape') {
          e.preventDefault();
          setIsHelpOpen(false);
        }
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlersRef.current.onToggleTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlersRef.current.onNextSection();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlersRef.current.onPrevSection();
          break;
        case 'r':
        case 'R':
          handlersRef.current.onResetSection();
          break;
        case 'f':
        case 'F':
          handlersRef.current.onToggleFullscreen();
          break;
        case '+':
        case '=':
          handlersRef.current.onAddExtraTime(60);
          break;
        case '?':
          e.preventDefault();
          setIsHelpOpen(true);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);

  return { isHelpOpen, setIsHelpOpen };
};

export default useKeyboardShortcuts;
