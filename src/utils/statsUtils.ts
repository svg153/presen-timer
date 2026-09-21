import { formatTime } from './timerUtils';

export interface SectionStat {
  name: string;
  planned: number; // seconds
  actual: number; // seconds actually spent (running time)
}

export interface PresentationStats {
  sections: SectionStat[];
  endedAt: number; // epoch ms of the snapshot
}

const formatDiff = (diff: number): string => (diff > 0 ? `+${formatTime(diff)}` : formatTime(diff));

// Tab-separated summary so it pastes cleanly into sheets/editors
export const buildStatsText = (stats: PresentationStats): string => {
  const rows = stats.sections.map(
    s => `${s.name}\t${formatTime(s.planned)}\t${formatTime(s.actual)}\t${formatDiff(s.actual - s.planned)}`
  );

  const totalPlanned = stats.sections.reduce((t, s) => t + s.planned, 0);
  const totalActual = stats.sections.reduce((t, s) => t + s.actual, 0);

  return [
    'Presentation summary',
    'Section\tPlanned\tActual\tDiff',
    ...rows,
    `Total\t${formatTime(totalPlanned)}\t${formatTime(totalActual)}\t${formatDiff(totalActual - totalPlanned)}`
  ].join('\n');
};
