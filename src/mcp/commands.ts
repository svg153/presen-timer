import { COMMANDS, COMMAND_NAMES, coerceSections, parseDuration } from '../../shared/mcp-protocol';
import type { CommandEnvelope, CommandName, TimerSection, TimerSnapshot } from '../../shared/mcp-protocol';
import { calculateProgress, calculateTotalDuration, formatTime } from '@/utils/timerUtils';

/** The slice of `useTimer`'s state this layer needs to read. */
export interface TimerLiveState {
  sections: TimerSection[];
  currentSectionIndex: number;
  timeRemaining: number;
  isRunning: boolean;
  isWarning: boolean;
}

/** The slice of `useTimer`'s API this layer is allowed to drive. */
export interface TimerActions {
  setSections(sections: TimerSection[]): void;
  toggleTimer(): void;
  resetSection(): void;
  nextSection(): void;
  prevSection(): void;
  jumpToSection(index: number): void;
  addExtraTime(seconds: number): void;
  endPresentation(): void;
}

/**
 * Every command answers with the projected state, or with a readable Spanish
 * error. Deliberately not a discriminated union: this repo compiles with
 * `strict: false`, where boolean-literal narrowing does not apply.
 */
export interface ApplyResult {
  ok: boolean;
  value?: CommandEnvelope;
  error?: string;
}

const fail = (error: string): ApplyResult => ({ ok: false, error });

export function buildSnapshot(state: TimerLiveState): TimerSnapshot {
  const totalDuration = calculateTotalDuration(state.sections);
  const progress = calculateProgress(state.sections, state.currentSectionIndex, state.timeRemaining);
  const current = state.sections[state.currentSectionIndex];

  return {
    sections: state.sections.map(section => ({ name: section.name, duration: section.duration })),
    currentSectionIndex: state.currentSectionIndex,
    currentSectionName: current ? current.name : null,
    timeRemaining: state.timeRemaining,
    timeRemainingLabel: formatTime(state.timeRemaining),
    isRunning: state.isRunning,
    isWarning: state.isWarning,
    totalDuration,
    totalDurationLabel: formatTime(totalDuration),
    elapsed: Math.round((progress / 100) * totalDuration),
    progress: Math.round(progress * 10) / 10,
    hasSections: state.sections.length > 0
  };
}

const succeed = (command: CommandName, changed: boolean, state: TimerLiveState, note?: string): ApplyResult => ({
  ok: true,
  value: {
    ok: true,
    command,
    changed,
    ...(note ? { note } : {}),
    ...buildSnapshot(state)
  }
});

/** State produced by any structural edit: `setSections` always rewinds to the first section. */
const afterSetSections = (sections: TimerSection[]): TimerLiveState => ({
  sections,
  currentSectionIndex: 0,
  timeRemaining: sections.length > 0 ? sections[0].duration : 0,
  isRunning: false,
  isWarning: false
});

const NO_SECTIONS = 'No hay ninguna sección definida. Usa timer_set_sections o timer_add_section primero.';

function toIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return null;
}

const sectionNames = (sections: TimerSection[]): string => sections.map((s, i) => `${i}: ${s.name}`).join(', ');

export function applyCommand(
  name: string,
  args: Record<string, unknown> | undefined,
  state: TimerLiveState,
  actions: TimerActions
): ApplyResult {
  const argv = args ?? {};

  if (!COMMAND_NAMES.includes(name as CommandName)) {
    return fail(`Comando desconocido: "${name}". Disponibles: ${COMMAND_NAMES.join(', ')}.`);
  }

  const command = name as CommandName;
  const lastIndex = state.sections.length - 1;

  try {
    switch (command) {
      case COMMANDS.GET_STATE:
        return succeed(command, false, state);

      case COMMANDS.SET_SECTIONS: {
        const coerced = coerceSections(argv.sections);
        if (!coerced.ok) return fail(coerced.error);
        actions.setSections(coerced.sections);
        return succeed(command, true, afterSetSections(coerced.sections));
      }

      case COMMANDS.ADD_SECTION: {
        const sectionName = typeof argv.name === 'string' ? argv.name.trim() : '';
        if (!sectionName) return fail('El argumento "name" es obligatorio y no puede estar vacío.');

        const duration = parseDuration(argv.duration);
        if (duration === null) {
          return fail(
            'Duración inválida en "duration". Usa "5m", "1h" o un número de segundos mayor que cero.'
          );
        }

        const sections = [...state.sections, { name: sectionName, duration }];
        actions.setSections(sections);
        return succeed(command, true, afterSetSections(sections));
      }

      case COMMANDS.UPDATE_SECTION: {
        const index = toIndex(argv.index);
        if (index === null) return fail('El argumento "index" es obligatorio y debe ser un entero mayor o igual que cero.');
        if (index > lastIndex) {
          return fail(`Índice ${index} fuera de rango. Hay ${state.sections.length} secciones (0 a ${lastIndex}).`);
        }

        const current = state.sections[index];
        let nextName = current.name;
        if (argv.name !== undefined) {
          nextName = typeof argv.name === 'string' ? argv.name.trim() : '';
          if (!nextName) return fail('El argumento "name" no puede estar vacío.');
        }

        let nextDuration = current.duration;
        if (argv.duration !== undefined) {
          const parsed = parseDuration(argv.duration);
          if (parsed === null) {
            return fail(
              'Duración inválida en "duration". Usa "5m", "1h" o un número de segundos mayor que cero.'
            );
          }
          nextDuration = parsed;
        }

        if (nextName === current.name && nextDuration === current.duration) {
          return succeed(command, false, state, 'La sección ya tenía esos valores.');
        }

        const sections = state.sections.map((section, i) =>
          i === index ? { name: nextName, duration: nextDuration } : section
        );
        actions.setSections(sections);
        return succeed(command, true, afterSetSections(sections));
      }

      case COMMANDS.REMOVE_SECTION: {
        const index = toIndex(argv.index);
        if (index === null) return fail('El argumento "index" es obligatorio y debe ser un entero mayor o igual que cero.');
        if (index > lastIndex) {
          return fail(`Índice ${index} fuera de rango. Hay ${state.sections.length} secciones (0 a ${lastIndex}).`);
        }

        const removed = state.sections[index];
        const sections = state.sections.filter((_, i) => i !== index);
        actions.setSections(sections);
        return succeed(command, true, afterSetSections(sections), `Se eliminó "${removed.name}".`);
      }

      case COMMANDS.START:
        if (!state.sections.length) return fail(NO_SECTIONS);
        if (state.isRunning) return succeed(command, false, state, 'La cuenta atrás ya estaba en marcha.');
        actions.toggleTimer();
        return succeed(command, true, { ...state, isRunning: true });

      case COMMANDS.PAUSE:
        if (!state.sections.length) return fail(NO_SECTIONS);
        if (!state.isRunning) return succeed(command, false, state, 'La cuenta atrás ya estaba en pausa.');
        actions.toggleTimer();
        return succeed(command, true, { ...state, isRunning: false });

      case COMMANDS.TOGGLE:
        if (!state.sections.length) return fail(NO_SECTIONS);
        actions.toggleTimer();
        return succeed(command, true, { ...state, isRunning: !state.isRunning });

      case COMMANDS.RESET_SECTION:
        if (!state.sections.length) return fail(NO_SECTIONS);
        actions.resetSection();
        return succeed(command, true, {
          ...state,
          timeRemaining: state.sections[state.currentSectionIndex].duration,
          isRunning: false,
          isWarning: false
        });

      case COMMANDS.NEXT_SECTION:
        if (!state.sections.length) return fail(NO_SECTIONS);
        if (state.currentSectionIndex >= lastIndex) {
          return succeed(command, false, state, `Ya es la última sección ("${state.sections[lastIndex].name}").`);
        }
        actions.nextSection();
        return succeed(command, true, {
          ...state,
          currentSectionIndex: state.currentSectionIndex + 1,
          timeRemaining: state.sections[state.currentSectionIndex + 1].duration,
          isWarning: false
        });

      case COMMANDS.PREV_SECTION:
        if (!state.sections.length) return fail(NO_SECTIONS);
        if (state.currentSectionIndex <= 0) {
          return succeed(command, false, state, `Ya es la primera sección ("${state.sections[0].name}").`);
        }
        actions.prevSection();
        return succeed(command, true, {
          ...state,
          currentSectionIndex: state.currentSectionIndex - 1,
          timeRemaining: state.sections[state.currentSectionIndex - 1].duration,
          isWarning: false
        });

      case COMMANDS.JUMP_TO_SECTION: {
        if (!state.sections.length) return fail(NO_SECTIONS);

        let target: number | null = null;

        if (argv.index !== undefined) {
          target = toIndex(argv.index);
          if (target === null) return fail('El argumento "index" debe ser un entero mayor o igual que cero.');
          if (target > lastIndex) {
            return fail(`Índice ${target} fuera de rango. Hay ${state.sections.length} secciones (0 a ${lastIndex}).`);
          }
        } else if (typeof argv.name === 'string' && argv.name.trim()) {
          const wanted = argv.name.trim().toLowerCase();
          const found = state.sections.findIndex(section => section.name.toLowerCase() === wanted);
          if (found === -1) {
            return fail(`No existe ninguna sección llamada "${argv.name.trim()}". Secciones: ${sectionNames(state.sections)}.`);
          }
          target = found;
        }

        if (target === null) {
          return fail('Indica "index" o "name" para elegir la sección de destino.');
        }

        const destination = state.sections[target];
        const changed = target !== state.currentSectionIndex || state.timeRemaining !== destination.duration;

        actions.jumpToSection(target);
        return succeed(
          command,
          changed,
          {
            ...state,
            currentSectionIndex: target,
            timeRemaining: destination.duration,
            isRunning: false,
            isWarning: false
          },
          changed ? undefined : `Ya estabas en "${destination.name}" con el tiempo completo.`
        );
      }

      case COMMANDS.ADD_TIME: {
        if (!state.sections.length) return fail(NO_SECTIONS);

        const seconds = parseDuration(argv.duration);
        if (seconds === null) {
          return fail(
            'Duración inválida en "duration". Usa "1m", "90" o un número de segundos mayor que cero.'
          );
        }

        actions.addExtraTime(seconds);
        return succeed(command, true, { ...state, timeRemaining: state.timeRemaining + seconds });
      }

      case COMMANDS.END_PRESENTATION: {
        const changed = state.isRunning;
        actions.endPresentation();
        return succeed(
          command,
          changed,
          { ...state, isRunning: false },
          changed ? undefined : 'La cuenta atrás ya estaba detenida.'
        );
      }

      default:
        return fail(`Comando desconocido: "${name}".`);
    }
  } catch (error) {
    return fail(`Error al ejecutar "${name}": ${error instanceof Error ? error.message : String(error)}`);
  }
}
