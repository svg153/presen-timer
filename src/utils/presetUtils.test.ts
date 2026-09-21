import { describe, expect, it } from 'vitest';
import { parseSections } from './timerUtils';
import { sectionsToText } from './presetUtils';

describe('sectionsToText', () => {
  it('escribe una sección por línea con el formato "Nombre: 5m"', () => {
    expect(
      sectionsToText([
        { name: 'Intro', duration: 300 },
        { name: 'Preguntas', duration: 120 },
      ])
    ).toBe('Intro: 5m\nPreguntas: 2m');
  });

  it('usa horas cuando la duración es un múltiplo exacto de 3600', () => {
    expect(sectionsToText([{ name: 'Taller', duration: 7200 }])).toBe('Taller: 2h');
  });
});

describe('ida y vuelta sectionsToText -> parseSections (P1-13)', () => {
  const roundTrip = (sections: { name: string; duration: number }[]) =>
    parseSections(sectionsToText(sections));

  it('conserva las secciones alineadas al minuto', () => {
    const sections = [
      { name: 'Apertura', duration: 120 },
      { name: 'Kata', duration: 600 },
      { name: 'Cierre', duration: 60 },
    ];
    expect(roundTrip(sections)).toEqual(sections);
  });

  it('conserva nombres con espacios, acentos y signos', () => {
    const sections = [
      { name: 'Introducción y contexto', duration: 180 },
      { name: '¿Preguntas? (ronda 1)', duration: 300 },
    ];
    expect(roundTrip(sections)).toEqual(sections);
  });

  it('conserva un nombre que contiene dos puntos', () => {
    // Regresión: partir por el primer ':' borraba la sección al editarla en bloque.
    const sections = [
      { name: 'Demo: parte 1', duration: 300 },
      { name: 'Demo: parte 2', duration: 420 },
    ];
    expect(roundTrip(sections)).toEqual(sections);
  });

  it('redondea al minuto las duraciones que no son múltiplos de 60', () => {
    // Limitación conocida del formato "Nm": los segundos sueltos se pierden.
    expect(roundTrip([{ name: 'Corta', duration: 90 }])).toEqual([
      { name: 'Corta', duration: 120 },
    ]);
  });

  it('devuelve una lista vacía si el texto no tiene líneas válidas', () => {
    expect(parseSections('sin dos puntos\n\n   ')).toEqual([]);
  });
});
