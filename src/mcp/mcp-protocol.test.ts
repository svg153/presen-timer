import { describe, expect, it } from 'vitest';

import {
  COMMANDS,
  COMMAND_NAMES,
  MESSAGE,
  PROTOCOL_VERSION,
  TIMER_TOOL_NAMES,
  TIMER_TOOLS,
  coerceSections,
  commandMessage,
  getTool,
  helloMessage,
  parseBridgeMessage,
  parseDuration,
  resultMessage,
  stateMessage,
  welcomeMessage
} from '../../shared/mcp-protocol';
import type { TimerSnapshot } from '../../shared/mcp-protocol';

const snapshot: TimerSnapshot = {
  sections: [{ name: 'Introducción', duration: 180 }],
  currentSectionIndex: 0,
  currentSectionName: 'Introducción',
  timeRemaining: 180,
  timeRemainingLabel: '03:00',
  isRunning: false,
  isWarning: false,
  totalDuration: 180,
  totalDurationLabel: '03:00',
  elapsed: 0,
  progress: 0,
  hasSections: true
};

describe('catálogo de herramientas', () => {
  it('expone 14 herramientas con nombre único', () => {
    expect(TIMER_TOOLS).toHaveLength(14);
    expect(new Set(TIMER_TOOL_NAMES).size).toBe(14);
  });

  it('cada herramienta tiene título, descripción y especificación de argumentos', () => {
    for (const tool of TIMER_TOOLS) {
      expect(tool.name).toMatch(/^timer_/);
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(typeof tool.args).toBe('object');
    }
  });

  it('no ofrece control de pantalla completa: necesita un gesto del usuario', () => {
    expect(TIMER_TOOL_NAMES).not.toContain('timer_toggle_fullscreen');
  });

  it('el catálogo y la lista de comandos que atiende el navegador coinciden', () => {
    expect([...TIMER_TOOL_NAMES].sort()).toEqual([...COMMAND_NAMES].sort());
  });

  it('getTool resuelve por nombre y devuelve null si no existe', () => {
    expect(getTool(COMMANDS.SET_SECTIONS).name).toBe('timer_set_sections');
    expect(getTool('timer_inventado')).toBeNull();
  });
});

describe('parseDuration', () => {
  it('entiende minutos, horas, segundos sueltos y cadenas numéricas', () => {
    expect(parseDuration('5m')).toBe(300);
    expect(parseDuration('1h')).toBe(3600);
    expect(parseDuration(' 90 ')).toBe(90);
    expect(parseDuration(600)).toBe(600);
    expect(parseDuration('2H')).toBe(7200);
  });

  it('rechaza lo que no puede interpretar', () => {
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('90s')).toBeNull();
    expect(parseDuration('0')).toBeNull();
    expect(parseDuration(-5)).toBeNull();
    expect(parseDuration(0)).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
  });
});

describe('coerceSections', () => {
  it('normaliza duraciones a segundos y recorta los nombres', () => {
    const result = coerceSections([
      { name: ' Intro ', duration: '3m' },
      { name: 'Demo', duration: 600 }
    ]);

    expect(result.ok).toBe(true);
    expect(result.sections).toEqual([
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 }
    ]);
  });

  it('explica qué sección está mal en lugar de fallar en silencio', () => {
    expect(coerceSections('no soy una lista').ok).toBe(false);
    expect(coerceSections([]).ok).toBe(false);
    expect(coerceSections([{ name: '  ', duration: '3m' }]).error).toMatch(/Sección 0/);
    expect(coerceSections([{ name: 'X', duration: 'nope' }]).error).toMatch(/duración inválida/);
    expect(coerceSections(['X']).error).toMatch(/se esperaba un objeto/);
  });
});

describe('mensajes del puente', () => {
  it('hace ida y vuelta por JSON sin perder nada', () => {
    const command = commandMessage({ id: 'abc', name: COMMANDS.SET_SECTIONS, args: { sections: [] } });
    expect(command).toEqual({
      type: MESSAGE.COMMAND,
      id: 'abc',
      name: 'timer_set_sections',
      args: { sections: [] }
    });
    expect(parseBridgeMessage(JSON.stringify(command))).toEqual(command);
  });

  it('construye hello, welcome, state y result', () => {
    expect(helloMessage({ client: { name: 'web', version: '1.0.0' } })).toEqual({
      type: MESSAGE.HELLO,
      protocolVersion: PROTOCOL_VERSION,
      client: { name: 'web', version: '1.0.0' }
    });
    expect(welcomeMessage({ sessionId: 's1', server: { name: 'presen-timer-mcp' } })).toMatchObject({
      type: MESSAGE.WELCOME,
      sessionId: 's1'
    });
    expect(stateMessage(snapshot)).toEqual({
      type: MESSAGE.STATE,
      snapshot
    });
    expect(resultMessage({ id: 'abc', ok: false, error: 'no' })).toEqual({
      type: MESSAGE.RESULT,
      id: 'abc',
      ok: false,
      value: null,
      error: 'no'
    });
  });

  it('devuelve null en lugar de lanzar con basura', () => {
    expect(parseBridgeMessage('no es json')).toBeNull();
    expect(parseBridgeMessage('{"sin":"tipo"}')).toBeNull();
    expect(parseBridgeMessage('{"type":"inventado"}')).toBeNull();
    expect(parseBridgeMessage(null)).toBeNull();
  });
});
