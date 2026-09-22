import { TimerSection } from '@/hooks/useTimer';
import { parseTimeString } from '@/utils/timerUtils';

// Strict parser for the bulk editor using the project's original text format:
// one section per line as "Name: duration" (e.g. "Intro: 5m", "Q&A: 2h").
// Unlike parseSections (which silently drops invalid lines), this throws a
// user-facing Error pointing at the offending line so bad pastes never apply.
export const parseSectionsStrict = (text: string): TimerSection[] => {
  const lines = text.split('\n');
  const sections: TimerSection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const sep = line.lastIndexOf(':');
    if (sep === -1) {
      throw new Error(`Line ${i + 1}: expected "Name: duration" (e.g. "Intro: 5m").`);
    }

    const name = line.slice(0, sep).trim();
    const timeStr = line.slice(sep + 1).trim();
    if (!name) {
      throw new Error(`Line ${i + 1}: missing section name.`);
    }

    const duration = parseTimeString(timeStr);
    if (duration <= 0) {
      throw new Error(`Line ${i + 1}: invalid duration "${timeStr}" (use minutes like "5m" or hours like "2h").`);
    }

    sections.push({ name, duration });
  }

  if (sections.length === 0) {
    throw new Error('Add at least one section.');
  }

  return sections;
};
