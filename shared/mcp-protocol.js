/**
 * Shared contract between the MCP server (Node) and the browser bridge.
 *
 * This module is dependency-free and pure ESM on purpose: it is imported both by
 * `mcp/server.mjs` (Node) and by `src/mcp/*` (bundled by Vite for the browser).
 * Keeping one definition here is what lets the transport change without touching
 * the command layer.
 */

export const PROTOCOL_VERSION = 1;

export const BRIDGE_HOST = '127.0.0.1';
export const DEFAULT_BRIDGE_PORT = 8765;

/** How long the server waits for a tab to answer a command before failing the tool call. */
export const COMMAND_TIMEOUT_MS = 5000;

/** localStorage key used by src/utils/timerUtils.ts. Duplicated there on purpose. */
export const APP_STORAGE_KEY = 'presentation-timer-sections';

export const MESSAGE = Object.freeze({
  HELLO: 'hello',
  WELCOME: 'welcome',
  STATE: 'state',
  COMMAND: 'command',
  RESULT: 'result',
  PING: 'ping',
});

export const COMMANDS = Object.freeze({
  GET_STATE: 'timer_get_state',
  SET_SECTIONS: 'timer_set_sections',
  ADD_SECTION: 'timer_add_section',
  UPDATE_SECTION: 'timer_update_section',
  REMOVE_SECTION: 'timer_remove_section',
  START: 'timer_start',
  PAUSE: 'timer_pause',
  TOGGLE: 'timer_toggle',
  RESET_SECTION: 'timer_reset_section',
  NEXT_SECTION: 'timer_next_section',
  PREV_SECTION: 'timer_prev_section',
  JUMP_TO_SECTION: 'timer_jump_to_section',
  ADD_TIME: 'timer_add_time',
  END_PRESENTATION: 'timer_end_presentation',
});

export const COMMAND_NAMES = Object.freeze(Object.values(COMMANDS));

/* -------------------------------------------------------------------------- */
/* Durations                                                                  */
/* -------------------------------------------------------------------------- */

const DURATION_PATTERN = /^(\d+)([mh])$/i;

/**
 * Accepts "5m", "1h", a plain number of seconds, or a numeric string.
 * Mirrors `parseTimeString` from src/utils/timerUtils.ts, widened to allow a
 * bare number so an agent can pass seconds directly.
 *
 * @returns {number|null} seconds, or null when the value cannot be understood.
 */
export function parseDuration(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    return seconds > 0 ? seconds : null;
  }

  const match = trimmed.match(DURATION_PATTERN);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const seconds = unit === 'h' ? amount * 3600 : amount * 60;

  return seconds > 0 ? seconds : null;
}

/**
 * Normalises raw section input coming from an agent into `{ name, duration }`
 * with durations in seconds.
 *
 * @returns {{ok: true, sections: Array<{name: string, duration: number}>}
 *          | {ok: false, error: string}}
 */
export function coerceSections(raw) {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'El argumento "sections" debe ser una lista.' };
  }

  const sections = [];

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: `Sección ${index}: se esperaba un objeto { name, duration }.` };
    }

    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (name === '') {
      return { ok: false, error: `Sección ${index}: el nombre no puede estar vacío.` };
    }

    const duration = parseDuration(item.duration);
    if (duration === null) {
      return {
        ok: false,
        error: `Sección ${index} ("${name}"): duración inválida ${JSON.stringify(item.duration)}. Usa "5m", "1h" o segundos.`,
      };
    }

    sections.push({ name, duration });
  }

  if (sections.length === 0) {
    return { ok: false, error: 'La lista de secciones está vacía.' };
  }

  return { ok: true, sections };
}

/* -------------------------------------------------------------------------- */
/* Tool catalogue                                                             */
/* -------------------------------------------------------------------------- */

const NO_ARGS = Object.freeze({});

/**
 * The single source of truth for the agent-facing surface.
 *
 * `args` is a small declarative description, not a Zod schema, so this module
 * stays dependency-free. `mcp/server.mjs` translates it into the Zod raw shape
 * the MCP SDK expects; `src/mcp/commands.ts` validates against it at runtime.
 */
export const TIMER_TOOLS = Object.freeze([
  {
    name: COMMANDS.GET_STATE,
    title: 'Consultar el estado del temporizador',
    description:
      'Devuelve el estado en vivo del temporizador: secciones, sección activa, tiempo restante, si está en marcha y el progreso. Úsala antes de decidir cualquier otra acción.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.SET_SECTIONS,
    title: 'Definir la estructura completa',
    description:
      'Reemplaza todas las secciones de la presentación. Reinicia la sección activa a la primera y detiene la cuenta atrás. Es la herramienta que se usa para crear la estructura desde cero.',
    args: {
      sections: {
        type: 'sections',
        required: true,
        description:
          'Lista ordenada de secciones. Cada una necesita "name" (texto) y "duration" ("5m", "1h" o segundos).',
      },
    },
  },
  {
    name: COMMANDS.ADD_SECTION,
    title: 'Añadir una sección al final',
    description: 'Añade una sección al final de la estructura actual. Como toda edición estructural, reinicia la sección activa a la primera y detiene la cuenta atrás.',
    args: {
      name: { type: 'string', required: true, description: 'Nombre de la sección.' },
      duration: {
        type: 'duration',
        required: true,
        description: 'Duración: "5m", "1h" o segundos.',
      },
    },
  },
  {
    name: COMMANDS.UPDATE_SECTION,
    title: 'Modificar una sección',
    description:
      'Cambia el nombre, la duración o ambos de una sección existente, identificada por su índice (0 es la primera). Como toda edición estructural, reinicia la sección activa a la primera y detiene la cuenta atrás.',
    args: {
      index: { type: 'integer', required: true, description: 'Índice de la sección, empezando en 0.' },
      name: { type: 'string', required: false, description: 'Nuevo nombre, si se quiere cambiar.' },
      duration: {
        type: 'duration',
        required: false,
        description: 'Nueva duración, si se quiere cambiar.',
      },
    },
  },
  {
    name: COMMANDS.REMOVE_SECTION,
    title: 'Eliminar una sección',
    description:
      'Elimina la sección indicada por su índice (0 es la primera). Como toda edición estructural, reinicia la sección activa a la primera y detiene la cuenta atrás.',
    args: {
      index: { type: 'integer', required: true, description: 'Índice de la sección, empezando en 0.' },
    },
  },
  {
    name: COMMANDS.START,
    title: 'Iniciar la cuenta atrás',
    description: 'Pone en marcha la cuenta atrás de la sección activa. No hace nada si ya está en marcha.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.PAUSE,
    title: 'Pausar la cuenta atrás',
    description: 'Detiene la cuenta atrás conservando el tiempo restante. No hace nada si ya está parada.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.TOGGLE,
    title: 'Invertir el estado de la cuenta atrás',
    description: 'Si está en marcha la pausa; si está parada la arranca.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.RESET_SECTION,
    title: 'Reiniciar la sección actual',
    description:
      'Devuelve la sección activa a su duración original y detiene la cuenta atrás.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.NEXT_SECTION,
    title: 'Avanzar a la siguiente sección',
    description:
      'Pasa a la sección siguiente, reiniciándola a su duración completa. Si era la última, no hace nada. Conserva el estado de marcha.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.PREV_SECTION,
    title: 'Volver a la sección anterior',
    description:
      'Vuelve a la sección anterior, reiniciándola a su duración completa. Si era la primera, no hace nada. Conserva el estado de marcha.',
    args: NO_ARGS,
  },
  {
    name: COMMANDS.JUMP_TO_SECTION,
    title: 'Saltar a una sección',
    description:
      'Salta a una sección por índice (empezando en 0) o por nombre (coincidencia exacta sin distinguir mayúsculas). Detiene la cuenta atrás. Hay que indicar uno de los dos.',
    args: {
      index: { type: 'integer', required: false, description: 'Índice de destino, empezando en 0.' },
      name: { type: 'string', required: false, description: 'Nombre exacto de la sección de destino.' },
    },
  },
  {
    name: COMMANDS.ADD_TIME,
    title: 'Añadir tiempo extra',
    description:
      'Suma tiempo a la cuenta atrás de la sección activa, por encima de su duración original. Sirve para alargar una sección sobre la marcha. No cambia la duración configurada de la sección ni el total del guion.',
    args: {
      duration: {
        type: 'duration',
        required: true,
        description: 'Tiempo a añadir: "2m", "1h" o segundos.',
      },
    },
  },
  {
    name: COMMANDS.END_PRESENTATION,
    title: 'Finalizar la presentación',
    description: 'Detiene la cuenta atrás y da la presentación por terminada.',
    args: NO_ARGS,
  },
]);

export const TIMER_TOOL_NAMES = Object.freeze(TIMER_TOOLS.map((tool) => tool.name));

export function getTool(name) {
  return TIMER_TOOLS.find((tool) => tool.name === name) || null;
}

/* -------------------------------------------------------------------------- */
/* Bridge messages                                                            */
/* -------------------------------------------------------------------------- */

export function helloMessage({ client = null, protocolVersion = PROTOCOL_VERSION } = {}) {
  return { type: MESSAGE.HELLO, protocolVersion, client };
}

export function welcomeMessage({ sessionId = null, server = null } = {}) {
  return { type: MESSAGE.WELCOME, protocolVersion: PROTOCOL_VERSION, sessionId, server };
}

export function stateMessage(snapshot) {
  return { type: MESSAGE.STATE, snapshot };
}

export function commandMessage({ id, name, args = {} }) {
  return { type: MESSAGE.COMMAND, id, name, args };
}

export function resultMessage({ id, ok, value = null, error = null }) {
  return { type: MESSAGE.RESULT, id, ok, value, error };
}

export function pingMessage() {
  return { type: MESSAGE.PING };
}

const KNOWN_MESSAGE_TYPES = new Set(Object.values(MESSAGE));

export function isBridgeMessage(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.type === 'string' &&
    KNOWN_MESSAGE_TYPES.has(value.type)
  );
}

/** Parses a raw WebSocket payload, returning null instead of throwing. */
export function parseBridgeMessage(raw) {
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    return isBridgeMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
