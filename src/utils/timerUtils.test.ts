import { describe, expect, it } from 'vitest';

import {
  calculateProgress,
  calculateTotalDuration,
  formatTime,
  parseSections,
  parseTimeString,
  secondsLeftFromEnd
} from './timerUtils';

describe('parseTimeString', () => {
  it('convierte minutos y horas a segundos', () => {
    expect(parseTimeString('3m')).toBe(180);
    expect(parseTimeString('1h')).toBe(3600);
    expect(parseTimeString(' 10m ')).toBe(600);
  });

  it('devuelve 0 para cualquier entrada que no encaje', () => {
    expect(parseTimeString('')).toBe(0);
    expect(parseTimeString('3')).toBe(0);
    expect(parseTimeString('3s')).toBe(0);
    expect(parseTimeString('-5m')).toBe(0);
  });
});

describe('parseSections', () => {
  it('lee una sección por línea con el formato "Nombre: duración"', () => {
    expect(parseSections('Intro: 3m\nDemo: 10m')).toEqual([
      { name: 'Intro', duration: 180 },
      { name: 'Demo', duration: 600 }
    ]);
  });

  it('ignora líneas vacías y líneas con duración inválida', () => {
    expect(parseSections('\nIntro: 3m\n\nRota: nope\nSinDuracion:\n')).toEqual([
      { name: 'Intro', duration: 180 }
    ]);
  });

  it('devuelve una lista vacía si no hay texto', () => {
    expect(parseSections('   ')).toEqual([]);
  });
});

describe('formatTime', () => {
  it('usa MM:SS por debajo de una hora', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(180)).toBe('03:00');
    expect(formatTime(59)).toBe('00:59');
  });

  it('usa HH:MM:SS a partir de una hora', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
  });

  it('no muestra tiempos negativos', () => {
    expect(formatTime(-5)).toBe('00:00');
  });
});

describe('calculateTotalDuration', () => {
  it('suma las duraciones y devuelve 0 sin secciones', () => {
    expect(calculateTotalDuration([{ duration: 180 }, { duration: 600 }])).toBe(780);
    expect(calculateTotalDuration([])).toBe(0);
  });
});

describe('calculateProgress', () => {
  const sections = [{ duration: 60 }, { duration: 60 }];

  it('calcula el porcentaje completado', () => {
    expect(calculateProgress(sections, 0, 60)).toBe(0);
    expect(calculateProgress(sections, 0, 30)).toBe(25);
    expect(calculateProgress(sections, 1, 60)).toBe(50);
    expect(calculateProgress(sections, 1, 0)).toBe(100);
  });

  it('devuelve 0 sin secciones o con duración total 0', () => {
    expect(calculateProgress([], 0, 0)).toBe(0);
    expect(calculateProgress([{ duration: 0 }], 0, 0)).toBe(0);
  });
});

describe('secondsLeftFromEnd', () => {
  const now = 1_700_000_000_000;

  it('redondea hacia arriba para no adelantar el final', () => {
    expect(secondsLeftFromEnd(now + 60_000, now)).toBe(60);
    expect(secondsLeftFromEnd(now + 59_400, now)).toBe(60);
    expect(secondsLeftFromEnd(now + 250, now)).toBe(1);
  });

  it('nunca devuelve valores negativos cuando la sección ya terminó', () => {
    expect(secondsLeftFromEnd(now, now)).toBe(0);
    expect(secondsLeftFromEnd(now - 30_000, now)).toBe(0);
  });
});
