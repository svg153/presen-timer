
/**
 * Timer utilities for managing time calculations and conversions
 */

// Parse time string in format like "3m" (3 minutes) or "2h" (2 hours)
export const parseTimeString = (timeStr: string): number => {
  const timePattern = /^(\d+)([mh])$/;
  const match = timeStr.trim().match(timePattern);
  
  if (!match) return 0;
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  if (unit === 'm') {
    return numValue * 60; // Convert minutes to seconds
  } else if (unit === 'h') {
    return numValue * 3600; // Convert hours to seconds
  }
  
  return 0;
};

// Parse multiple sections from a text block
export const parseSections = (text: string): { name: string; duration: number }[] => {
  if (!text.trim()) return [];
  
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      // Split on the *last* colon so a name that contains one still round-trips
      // through the bulk text editor, which writes "Name: 5m" per line.
      const separator = line.lastIndexOf(':');
      if (separator === -1) return null;

      const name = line.slice(0, separator).trim();
      const timeStr = line.slice(separator + 1).trim();

      if (!name || !timeStr) return null;

      const duration = parseTimeString(timeStr);
      return { name, duration };
    })
    .filter((section): section is { name: string; duration: number } => 
      section !== null && section.duration > 0
    );
};

// Format seconds as MM:SS or HH:MM:SS; negative values render as -MM:SS
export const formatTime = (seconds: number): string => {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;
  
  if (hours > 0) {
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${sign}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Calculate the total duration of all sections
export const calculateTotalDuration = (sections: { duration: number }[]): number => {
  return sections.reduce((total, section) => total + section.duration, 0);
};

// Calculate elapsed percentage for progress bar
export const calculateProgress = (
  sections: { duration: number }[],
  currentSectionIndex: number,
  remainingTime: number
): number => {
  if (sections.length === 0) return 0;
  
  const totalDuration = calculateTotalDuration(sections);
  if (totalDuration === 0) return 0;
  
  const completedSections = sections.slice(0, currentSectionIndex);
  const completedTime = calculateTotalDuration(completedSections);
  const currentSectionElapsed = sections[currentSectionIndex]?.duration - remainingTime;
  
  const totalElapsed = completedTime + (currentSectionElapsed || 0);
  return (totalElapsed / totalDuration) * 100;
};

// Seconds remaining given an absolute end timestamp (Date.now() based)
export const secondsLeftFromEnd = (endAtMs: number, nowMs: number): number => {
  return Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));
};

// Local storage helpers
export const STORAGE_KEY = 'presentation-timer-sections';

export const saveToLocalStorage = (sections: { name: string; duration: number }[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): { name: string; duration: number }[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return [];
  }
};
