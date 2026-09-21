import { TimerSection } from '@/hooks/useTimer';

// Serializes the current sections into a copy/paste-friendly JSON array.
// Durations are in seconds (TimerSection's internal unit) so the round-trip
// with import/export presets stays exact.
export const sectionsToJson = (sections: TimerSection[]): string =>
  JSON.stringify(sections.map(({ name, duration }) => ({ name, duration })), null, 2);

// Parses the bulk editor JSON and validates every section.
// Throws Error with a user-facing message when anything is invalid.
export const parseSectionsJson = (text: string): TimerSection[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The sections are not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of sections.');
  }

  const sections: TimerSection[] = [];
  parsed.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Section ${index + 1} must be an object with "name" and "duration".`);
    }
    const { name, duration } = item as { name?: unknown; duration?: unknown };
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`Section ${index + 1} needs a non-empty "name".`);
    }
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Section ${index + 1} needs "duration" as a positive number of seconds.`);
    }
    sections.push({ name: name.trim(), duration: Math.round(duration) });
  });

  if (sections.length === 0) {
    throw new Error('Add at least one section.');
  }
  return sections;
};
