import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMAND_NAMES, COMMANDS } from '../../shared/mcp-protocol';
import { applyCommand, buildSnapshot } from './commands';
import type { TimerLiveState } from './commands';

interface Harness {
  state: TimerLiveState;
  actions: {
    setSections: ReturnType<typeof vi.fn>;
    toggleTimer: ReturnType<typeof vi.fn>;
    resetSection: ReturnType<typeof vi.fn>;
    nextSection: ReturnType<typeof vi.fn>;
    prevSection: ReturnType<typeof vi.fn>;
    jumpToSection: ReturnType<typeof vi.fn>;
    addExtraTime: ReturnType<typeof vi.fn>;
    endPresentation: ReturnType<typeof vi.fn>;
  };
  run: (name: string, args?: Record<string, unknown>) => ReturnType<typeof applyCommand>;
}

const makeHarness = (overrides: Partial<TimerLiveState> = {}): Harness => {
  const state: TimerLiveState = {
    sections: [
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 }
    ],
    currentSectionIndex: 0,
    timeRemaining: 180,
    isRunning: false,
    isWarning: false,
    ...overrides
  };

  const actions = {
    setSections: vi.fn(),
    toggleTimer: vi.fn(),
    resetSection: vi.fn(),
    nextSection: vi.fn(),
    prevSection: vi.fn(),
    jumpToSection: vi.fn(),
    addExtraTime: vi.fn(),
    endPresentation: vi.fn()
  };

  return { state, actions, run: (name, args) => applyCommand(name, args, state, actions) };
};

let harness: Harness;
beforeEach(() => {
  harness = makeHarness();
});

describe('validación previa', () => {
  it('rechaza un comando desconocido sin tocar el temporizador', () => {
    const result = harness.run('timer_inventado');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Comando desconocido/);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });

  it('atiende los 14 comandos del catálogo: ninguno cae en el caso por defecto', () => {
    for (const name of COMMAND_NAMES) {
      expect(harness.run(name).error ?? '').not.toMatch(/Comando desconocido/);
    }
  });

  it('los comandos que necesitan secciones lo dicen antes de actuar', () => {
    const empty = makeHarness({ sections: [], timeRemaining: 0 });
    const result = empty.run(COMMANDS.START);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No hay ninguna sección/);
    expect(empty.actions.toggleTimer).not.toHaveBeenCalled();
  });
});

describe('buildSnapshot', () => {
  it('proyecta el estado con etiquetas listas para el agente', () => {
    const snapshot = buildSnapshot(harness.state);

    expect(snapshot).toMatchObject({
      currentSectionIndex: 0,
      currentSectionName: 'Intro',
      timeRemaining: 180,
      timeRemainingLabel: '03:00',
      totalDuration: 780,
      totalDurationLabel: '13:00',
      elapsed: 0,
      progress: 0,
      hasSections: true
    });
    expect(snapshot.sections).toEqual([
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 }
    ]);
  });

  it('no revienta sin secciones', () => {
    expect(buildSnapshot({ ...harness.state, sections: [], timeRemaining: 0 })).toMatchObject({
      currentSectionName: null,
      totalDuration: 0,
      progress: 0,
      hasSections: false
    });
  });
});

describe('timer_get_state', () => {
  it('devuelve el estado sin marcarlo como cambio', () => {
    const result = harness.run(COMMANDS.GET_STATE);

    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ command: 'timer_get_state', changed: false, isRunning: false });
  });
});

describe('estructura remota', () => {
  it('timer_set_sections normaliza las duraciones y reinicia a la primera sección', () => {
    const result = harness.run(COMMANDS.SET_SECTIONS, {
      sections: [
        { name: ' Intro ', duration: '3m' },
        { name: 'Demo', duration: 600 }
      ]
    });

    expect(harness.actions.setSections).toHaveBeenCalledWith([
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 }
    ]);
    expect(result.value).toMatchObject({
      changed: true,
      currentSectionIndex: 0,
      timeRemaining: 180,
      isRunning: false,
      totalDuration: 780
    });
  });

  it('timer_set_sections no toca nada si la entrada es inválida', () => {
    const result = harness.run(COMMANDS.SET_SECTIONS, { sections: [{ name: 'X', duration: 'nope' }] });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/duración inválida/);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });

  it('timer_add_section añade al final', () => {
    const result = harness.run(COMMANDS.ADD_SECTION, { name: 'Preguntas', duration: '2m' });

    expect(harness.actions.setSections).toHaveBeenCalledWith([
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 },
      { name: 'Preguntas', duration: 120 }
    ]);
    expect(result.value).toMatchObject({ changed: true, totalDuration: 900 });
  });

  it('timer_add_section exige nombre y duración válida', () => {
    expect(harness.run(COMMANDS.ADD_SECTION, { name: '   ', duration: '2m' }).error).toMatch(/"name" es obligatorio/);
    expect(harness.run(COMMANDS.ADD_SECTION, { name: 'X' }).error).toMatch(/Duración inválida/);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });

  it('timer_update_section cambia nombre y duración de una sección concreta', () => {
    const result = harness.run(COMMANDS.UPDATE_SECTION, { index: 1, name: 'Demo en vivo', duration: '12m' });

    expect(harness.actions.setSections).toHaveBeenCalledWith([
      { name: 'Intro', duration: 180 },
      { name: 'Demo en vivo', duration: 720 }
    ]);
    expect(result.value).toMatchObject({ changed: true, currentSectionIndex: 0, timeRemaining: 180 });
  });

  it('timer_update_section no cambia nada si los valores son los mismos', () => {
    const result = harness.run(COMMANDS.UPDATE_SECTION, { index: 0, name: 'Intro' });

    expect(result.ok).toBe(true);
    expect(result.value.changed).toBe(false);
    expect(result.value.note).toMatch(/ya tenía esos valores/);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });

  it('timer_update_section explica el rango válido cuando el índice se pasa', () => {
    const result = harness.run(COMMANDS.UPDATE_SECTION, { index: 9, duration: '1m' });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/fuera de rango/);
    expect(result.error).toMatch(/0 a 1/);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });

  it('timer_remove_section elimina por índice y lo deja dicho', () => {
    const result = harness.run(COMMANDS.REMOVE_SECTION, { index: 0 });

    expect(harness.actions.setSections).toHaveBeenCalledWith([{ name: 'Demo', duration: 600 }]);
    expect(result.value).toMatchObject({ changed: true, currentSectionIndex: 0, timeRemaining: 600 });
    expect(result.value.note).toMatch(/Intro/);
  });

  it('timer_remove_section rechaza índices no enteros o negativos', () => {
    expect(harness.run(COMMANDS.REMOVE_SECTION, { index: -1 }).ok).toBe(false);
    expect(harness.run(COMMANDS.REMOVE_SECTION, { index: '1.5' }).ok).toBe(false);
    expect(harness.actions.setSections).not.toHaveBeenCalled();
  });
});

describe('control de la cuenta atrás', () => {
  it('timer_start arranca y avisa de que ya estaba en marcha', () => {
    expect(harness.run(COMMANDS.START).value).toMatchObject({ changed: true, isRunning: true });
    expect(harness.actions.toggleTimer).toHaveBeenCalledTimes(1);

    const running = makeHarness({ isRunning: true });
    const result = running.run(COMMANDS.START);
    expect(result.value).toMatchObject({ changed: false, isRunning: true });
    expect(result.value.note).toMatch(/ya estaba en marcha/);
    expect(running.actions.toggleTimer).not.toHaveBeenCalled();
  });

  it('timer_pause para la cuenta atrás y avisa de que ya estaba en pausa', () => {
    const running = makeHarness({ isRunning: true });
    expect(running.run(COMMANDS.PAUSE).value).toMatchObject({ changed: true, isRunning: false });
    expect(running.actions.toggleTimer).toHaveBeenCalledTimes(1);

    const result = harness.run(COMMANDS.PAUSE);
    expect(result.value).toMatchObject({ changed: false, isRunning: false });
    expect(result.value.note).toMatch(/ya estaba en pausa/);
    expect(harness.actions.toggleTimer).not.toHaveBeenCalled();
  });

  it('timer_toggle invierte el estado', () => {
    expect(harness.run(COMMANDS.TOGGLE).value).toMatchObject({ changed: true, isRunning: true });
    const running = makeHarness({ isRunning: true });
    expect(running.run(COMMANDS.TOGGLE).value).toMatchObject({ changed: true, isRunning: false });
  });

  it('timer_reset_section devuelve el tiempo completo y detiene la cuenta', () => {
    const mid = makeHarness({ currentSectionIndex: 1, timeRemaining: 12, isRunning: true, isWarning: true });
    const result = mid.run(COMMANDS.RESET_SECTION);

    expect(mid.actions.resetSection).toHaveBeenCalledTimes(1);
    expect(result.value).toMatchObject({ timeRemaining: 600, isRunning: false, isWarning: false });
  });

  it('timer_add_time suma segundos al tiempo restante', () => {
    const result = harness.run(COMMANDS.ADD_TIME, { duration: '1m' });

    expect(harness.actions.addExtraTime).toHaveBeenCalledWith(60);
    expect(result.value).toMatchObject({ changed: true, timeRemaining: 240, timeRemainingLabel: '04:00' });
  });

  it('timer_end_presentation detiene la presentación', () => {
    const running = makeHarness({ isRunning: true });
    expect(running.run(COMMANDS.END_PRESENTATION).value).toMatchObject({ changed: true, isRunning: false });
    expect(running.actions.endPresentation).toHaveBeenCalledTimes(1);

    const result = harness.run(COMMANDS.END_PRESENTATION);
    expect(result.value.changed).toBe(false);
    expect(result.value.note).toMatch(/ya estaba detenida/);
  });
});

describe('navegación entre secciones', () => {
  it('timer_next_section avanza y mantiene la cuenta atrás en marcha', () => {
    const running = makeHarness({ isRunning: true });
    const result = running.run(COMMANDS.NEXT_SECTION);

    expect(running.actions.nextSection).toHaveBeenCalledTimes(1);
    expect(result.value).toMatchObject({
      changed: true,
      currentSectionIndex: 1,
      currentSectionName: 'Demo',
      timeRemaining: 600,
      isRunning: true
    });
  });

  it('timer_next_section no pasa de la última sección', () => {
    const last = makeHarness({ currentSectionIndex: 1, timeRemaining: 600 });
    const result = last.run(COMMANDS.NEXT_SECTION);

    expect(result.value.changed).toBe(false);
    expect(result.value.note).toMatch(/última sección/);
    expect(last.actions.nextSection).not.toHaveBeenCalled();
  });

  it('timer_prev_section retrocede y no pasa de la primera', () => {
    const second = makeHarness({ currentSectionIndex: 1, timeRemaining: 600 });
    const result = second.run(COMMANDS.PREV_SECTION);
    expect(second.actions.prevSection).toHaveBeenCalledTimes(1);
    expect(result.value).toMatchObject({ changed: true, currentSectionIndex: 0, timeRemaining: 180 });

    const first = harness.run(COMMANDS.PREV_SECTION);
    expect(first.value.changed).toBe(false);
    expect(first.value.note).toMatch(/primera sección/);
    expect(harness.actions.prevSection).not.toHaveBeenCalled();
  });

  it('timer_jump_to_section acepta índice o nombre, sin distinguir mayúsculas', () => {
    const byIndex = harness.run(COMMANDS.JUMP_TO_SECTION, { index: '1' });
    expect(harness.actions.jumpToSection).toHaveBeenCalledWith(1);
    expect(byIndex.value).toMatchObject({ changed: true, currentSectionIndex: 1, isRunning: false });

    const byName = harness.run(COMMANDS.JUMP_TO_SECTION, { name: 'demo' });
    expect(harness.actions.jumpToSection).toHaveBeenCalledWith(1);
    expect(byName.value).toMatchObject({ changed: true, currentSectionIndex: 1 });
  });

  it('timer_jump_to_section lista las secciones cuando el nombre no existe', () => {
    const result = harness.run(COMMANDS.JUMP_TO_SECTION, { name: 'Cierre' });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No existe ninguna sección llamada "Cierre"/);
    expect(result.error).toMatch(/0: Intro, 1: Demo/);
    expect(harness.actions.jumpToSection).not.toHaveBeenCalled();
  });

  it('timer_jump_to_section exige index o name', () => {
    const result = harness.run(COMMANDS.JUMP_TO_SECTION, {});

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Indica "index" o "name"/);
    expect(harness.actions.jumpToSection).not.toHaveBeenCalled();
  });

  it('timer_jump_to_section no marca cambio si ya estabas ahí con el tiempo completo', () => {
    const result = harness.run(COMMANDS.JUMP_TO_SECTION, { index: 0 });

    expect(result.value.changed).toBe(false);
    expect(result.value.note).toMatch(/Ya estabas en "Intro"/);
  });
});
