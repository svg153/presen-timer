import { formatTime } from './timerUtils';

export interface Preset {
  name: string;
  sections: { name: string; duration: number }[];
}

export const PRESETS_STORAGE_KEY = 'presentation-timer-presets';

export const isValidPreset = (value: unknown): value is Preset => {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Preset;
  if (typeof p.name !== 'string' || !p.name.trim()) return false;
  if (!Array.isArray(p.sections)) return false;
  return p.sections.every(
    s =>
      typeof s === 'object' && s !== null &&
      typeof s.name === 'string' &&
      typeof s.duration === 'number' && s.duration > 0
  );
};

export const loadPresets = (): Preset[] => {
  try {
    const data = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter(isValidPreset) : [];
  } catch (error) {
    console.error('Failed to load presets from localStorage:', error);
    return [];
  }
};

export const savePresets = (presets: Preset[]): void => {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save presets to localStorage:', error);
  }
};

// Saves (or overwrites, by name) a preset and returns the updated list
export const savePreset = (name: string, sections: { name: string; duration: number }[]): Preset[] => {
  const trimmed = name.trim();
  if (!trimmed) return loadPresets();
  const normalized = sections.map(s => ({ name: s.name, duration: s.duration }));
  const next = [
    ...loadPresets().filter(p => p.name !== trimmed),
    { name: trimmed, sections: normalized }
  ];
  savePresets(next);
  return next;
};

export const deletePreset = (name: string): Preset[] => {
  const next = loadPresets().filter(p => p.name !== name);
  savePresets(next);
  return next;
};

// A preset is "active" when the current sections are exactly its sections
export const isSameSections = (
  a: { name: string; duration: number }[],
  b: { name: string; duration: number }[]
): boolean => {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s.name === b[i].name && s.duration === b[i].duration);
};

// Serializes sections back to the textarea format ("Name: 5m"), using
// whole hours when possible so parseSections can round-trip them
export const sectionsToText = (sections: { name: string; duration: number }[]): string => {
  return sections
    .map(s => {
      const duration = s.duration % 3600 === 0 ? `${s.duration / 3600}h` : `${Math.round(s.duration / 60)}m`;
      return `${s.name}: ${duration}`;
    })
    .join('\n');
};

export const formatPresetSummary = (sections: { name: string; duration: number }[]): string => {
  return `${sections.length} sections · ${formatTime(sections.reduce((t, s) => t + s.duration, 0))}`;
};
