import type { Preset } from './presetUtils';

// Factory templates: read-only, code-defined presets that are always
// available in the preset select without any configuration. They are NOT
// seeded into localStorage, so user preset data (save/delete/export/import)
// stays untouched.
export type FactoryTemplate = Preset;

export const FACTORY_TEMPLATES: readonly FactoryTemplate[] = [
  {
    name: 'Lightning talk (5m)',
    sections: [
      { name: 'Intro', duration: 60 },
      { name: 'Talk', duration: 180 },
      { name: 'Q&A', duration: 60 }
    ]
  },
  {
    name: 'Charla (20m)',
    sections: [
      { name: 'Apertura', duration: 120 },
      { name: 'Contenido', duration: 900 },
      { name: 'Preguntas', duration: 180 }
    ]
  },
  {
    name: 'Taller (90m)',
    sections: [
      { name: 'Introducción', duration: 300 },
      { name: 'Teoría', duration: 1500 },
      { name: 'Práctica', duration: 3000 },
      { name: 'Cierre', duration: 600 }
    ]
  },
  {
    name: 'Defensa TFG (15m)',
    sections: [
      { name: 'Introducción', duration: 60 },
      { name: 'Resultados', duration: 420 },
      { name: 'Demostración', duration: 300 },
      { name: 'Preguntas', duration: 120 }
    ]
  },
  {
    name: 'Keynote (45m)',
    sections: [
      { name: 'Apertura', duration: 300 },
      { name: 'Ponencia', duration: 2100 },
      { name: 'Cierre', duration: 300 }
    ]
  }
];

// Select values must be unique across user presets and templates; the
// "template:" prefix guarantees no collision with user preset names.
export const TEMPLATE_VALUE_PREFIX = 'template:';

export const templateValue = (name: string): string => `${TEMPLATE_VALUE_PREFIX}${name}`;

export const isTemplateValue = (value: string): boolean =>
  value.startsWith(TEMPLATE_VALUE_PREFIX);

export const templateFromValue = (value: string): FactoryTemplate | undefined =>
  isTemplateValue(value)
    ? FACTORY_TEMPLATES.find(t => t.name === value.slice(TEMPLATE_VALUE_PREFIX.length))
    : undefined;
