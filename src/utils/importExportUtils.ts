import { Preset, isValidPreset } from './presetUtils';

const EXPORT_VERSION = 1;

interface ExportPayload {
  version: number;
  presets: Preset[];
}

export const serializePresets = (presets: Preset[]): string => {
  const payload: ExportPayload = { version: EXPORT_VERSION, presets };
  return JSON.stringify(payload, null, 2);
};

// Parses the raw contents of an imported file and validates every preset.
// Accepts the exported payload shape ({ version, presets }) or a bare array.
// Throws Error with a user-facing message when anything is invalid.
export const parseImportedPresets = (raw: string): Preset[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as ExportPayload).presets)
      ? (parsed as ExportPayload).presets
      : null;

  if (!candidates) {
    throw new Error('Expected a preset list (array or { presets: [...] }).');
  }

  if (candidates.some(p => !isValidPreset(p))) {
    throw new Error('Every preset needs a name and sections with name and duration > 0.');
  }

  // Deduplicate by name within the file itself (last one wins)
  const byName = new Map<string, Preset>();
  for (const preset of candidates as Preset[]) {
    byName.set(preset.name.trim(), { ...preset, name: preset.name.trim() });
  }
  return Array.from(byName.values());
};

// Merges imported presets into the existing list. A preset with the same
// name overwrites the saved one. Returns the merged list plus the names
// that were overwritten, for user feedback.
export const mergePresets = (
  imported: Preset[],
  existing: Preset[]
): { merged: Preset[]; overwritten: string[] } => {
  const importedNames = new Set(imported.map(p => p.name));
  const overwritten = existing.filter(p => importedNames.has(p.name)).map(p => p.name);
  const kept = existing.filter(p => !importedNames.has(p.name));
  return { merged: [...kept, ...imported], overwritten };
};

// Downloads the presets as a .json file
export const downloadPresetsFile = (presets: Preset[]): void => {
  const blob = new Blob([serializePresets(presets)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'presen-timer-presets.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
