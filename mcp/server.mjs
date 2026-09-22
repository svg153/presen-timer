#!/usr/bin/env node
/**
 * presen-timer MCP server.
 *
 * Speaks MCP over stdio to the client that launched it (Claude Code, GitHub
 * Copilot CLI, Cursor…) and bridges every `timer_*` tool call to the browser tab
 * over a loopback WebSocket.
 *
 * Two rules matter here:
 *   1. stdout is the JSON-RPC channel. Every log line goes to stderr.
 *   2. The WebSocket listens on 127.0.0.1 only, so no token is needed.
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

import {
  BRIDGE_HOST,
  COMMAND_TIMEOUT_MS,
  DEFAULT_BRIDGE_PORT,
  MESSAGE,
  PROTOCOL_VERSION,
  TIMER_TOOLS,
  commandMessage,
  parseBridgeMessage,
  resultMessage,
  welcomeMessage,
} from '../shared/mcp-protocol.js';

const SERVER_NAME = 'presen-timer';
const SERVER_VERSION = '1.0.0';
const HEARTBEAT_MS = 30000;
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const log = (...args) => console.error(`[presen-timer-mcp]`, ...args);

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const options = { port: null, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--port' || arg === '-p') {
      options.port = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith('--port=')) {
      options.port = arg.slice('--port='.length);
    }
  }

  return options;
}

function resolvePort(cliPort) {
  const raw = cliPort ?? process.env.PRESEN_TIMER_MCP_PORT ?? String(DEFAULT_BRIDGE_PORT);
  const port = Number.parseInt(String(raw), 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    log(`puerto inválido: ${JSON.stringify(raw)}. Usa un número entre 1 y 65535.`);
    process.exit(1);
  }

  return port;
}

/* -------------------------------------------------------------------------- */
/* Origin policy                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The bridge is bound to loopback, so the Origin check is defence in depth: it
 * stops a random internet page open in the same browser from driving the timer.
 * Requests without an Origin header come from non-browser clients and are
 * allowed, because they are already constrained to the local machine.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const { hostname } = new URL(origin);
    return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Bridge                                                                     */
/* -------------------------------------------------------------------------- */

class Bridge {
  constructor(port) {
    this.port = port;
    this.clients = new Map();
    this.pending = new Map();
    this.lastSnapshot = null;
    this.server = null;
    this.heartbeat = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({
        host: BRIDGE_HOST,
        port: this.port,
        verifyClient: ({ origin }, done) => {
          const allowed = isAllowedOrigin(origin);
          if (!allowed) log(`conexión rechazada: Origin no permitido (${origin})`);
          done(allowed, allowed ? undefined : 403, allowed ? undefined : 'Origin no permitido');
        },
      });

      server.once('listening', () => {
        this.server = server;
        log(`puente WebSocket escuchando en ws://${BRIDGE_HOST}:${this.port}`);
        this.heartbeat = setInterval(() => this.ping(), HEARTBEAT_MS);
        this.heartbeat.unref?.();
        resolve();
      });

      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(
            new Error(
              `el puerto ${this.port} ya está en uso. Arranca con --port <otro> o libera el puerto.`,
            ),
          );
          return;
        }
        reject(error);
      });

      server.on('connection', (socket, request) => this.onConnection(socket, request));
    });
  }

  onConnection(socket, request) {
    const sessionId = randomUUID();
    const client = {
      sessionId,
      socket,
      origin: request?.headers?.origin ?? null,
      connectedAt: Date.now(),
    };

    this.clients.set(sessionId, client);
    log(`pestaña conectada (${sessionId}) — ${this.clients.size} activa(s)`);

    socket.send(JSON.stringify(welcomeMessage({ sessionId, server: { name: SERVER_NAME, version: SERVER_VERSION } })));

    if (this.lastSnapshot) {
      socket.send(JSON.stringify({ type: MESSAGE.STATE, snapshot: this.lastSnapshot }));
    }

    socket.on('message', (raw) => this.onMessage(client, raw.toString()));
    socket.on('close', () => this.onClose(client));
    socket.on('error', (error) => log(`error de socket (${sessionId}): ${error.message}`));
  }

  onClose(client) {
    this.clients.delete(client.sessionId);
    log(`pestaña desconectada (${client.sessionId}) — ${this.clients.size} activa(s)`);
  }

  onMessage(client, raw) {
    const message = parseBridgeMessage(raw);

    if (!message) {
      log(`mensaje ignorado (no es JSON válido del protocolo): ${raw.slice(0, 120)}`);
      return;
    }

    switch (message.type) {
      case MESSAGE.HELLO:
        log(`hello de ${message.client?.name ?? 'cliente desconocido'} (protocolo ${message.protocolVersion})`);
        break;

      case MESSAGE.STATE:
        if (message.snapshot && typeof message.snapshot === 'object') {
          this.lastSnapshot = message.snapshot;
        }
        break;

      case MESSAGE.RESULT:
        this.settle(message);
        break;

      default:
        break;
    }
  }

  settle(message) {
    const entry = this.pending.get(message.id);
    if (!entry) return;

    this.pending.delete(message.id);
    clearTimeout(entry.timer);

    if (message.ok) {
      entry.resolve(message.value);
    } else {
      entry.reject(new Error(message.error || 'la pestaña devolvió un error sin detalle'));
    }
  }

  ping() {
    const payload = JSON.stringify({ type: MESSAGE.PING });
    for (const client of this.clients.values()) {
      if (client.socket.readyState === client.socket.OPEN) client.socket.send(payload);
    }
  }

  /** Sends a command to every connected tab and resolves with the first answer. */
  send(name, args = {}) {
    if (this.clients.size === 0) {
      return Promise.reject(
        new Error(
          'No hay ninguna pestaña conectada al puente. Abre la aplicación en http://localhost ' +
            '(por ejemplo `npm run dev`) y espera a que el indicador de la cabecera se ponga en verde. ' +
            'La versión publicada en GitHub Pages no puede usar el puente porque HTTPS no puede hablar con ws://localhost.',
        ),
      );
    }

    const id = randomUUID();
    const payload = JSON.stringify(commandMessage({ id, name, args }));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `La pestaña no respondió a "${name}" en ${COMMAND_TIMEOUT_MS} ms. ` +
              'Comprueba que sigue abierta y que el puente aparece como conectado.',
          ),
        );
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer, name });

      for (const client of this.clients.values()) {
        if (client.socket.readyState === client.socket.OPEN) client.socket.send(payload);
      }
    });
  }

  async stop() {
    if (this.heartbeat) clearInterval(this.heartbeat);

    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('el servidor MCP se está cerrando'));
    }
    this.pending.clear();

    for (const client of this.clients.values()) {
      try {
        client.socket.close(1001, 'servidor cerrando');
      } catch {
        /* el socket ya estaba cerrado */
      }
    }
    this.clients.clear();

    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* MCP surface                                                                */
/* -------------------------------------------------------------------------- */

const durationSchema = z.union([z.string(), z.number()]);

function zodForArg(spec) {
  switch (spec.type) {
    case 'string':
      return z.string();
    case 'integer':
      return z.number().int().min(0);
    case 'duration':
      return durationSchema;
    case 'sections':
      return z.array(z.object({ name: z.string(), duration: durationSchema }));
    default:
      throw new Error(`tipo de argumento desconocido: ${spec.type}`);
  }
}

function zodShapeForTool(tool) {
  const shape = {};

  for (const [key, spec] of Object.entries(tool.args)) {
    const schema = zodForArg(spec);
    shape[key] = spec.required ? schema : schema.optional();
  }

  return shape;
}

function textResult(value, isError = false) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }], isError };
}

function buildServer(bridge) {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  for (const tool of TIMER_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: zodShapeForTool(tool),
      },
      async (args) => {
        try {
          const value = await bridge.send(tool.name, args ?? {});
          return textResult(value ?? { ok: true });
        } catch (error) {
          log(`error en ${tool.name}: ${error.message}`);
          return textResult({ ok: false, error: error.message }, true);
        }
      },
    );
  }

  return server;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(
      [
        'presen-timer MCP server',
        '',
        'Uso: npm run mcp [-- --port 8765]',
        '',
        'Opciones:',
        '  --port, -p <puerto>   Puerto del puente WebSocket (por defecto 8765).',
        '                        También se puede fijar con PRESEN_TIMER_MCP_PORT.',
        '  --help, -h            Muestra esta ayuda.',
        '',
        `El puente escucha solo en ${BRIDGE_HOST}; no se expone a la red.`,
        '',
      ].join('\n'),
    );
    return;
  }

  const port = resolvePort(options.port);
  const bridge = new Bridge(port);

  try {
    await bridge.start();
  } catch (error) {
    log(`no se pudo arrancar el puente: ${error.message}`);
    process.exit(1);
  }

  const server = buildServer(bridge);
  const transport = new StdioServerTransport();

  let shuttingDown = false;
  const shutdown = async (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`cerrando (${reason})`);
    await bridge.stop();
    await server.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.stdin.on('close', () => void shutdown('stdin cerrado'));

  await server.connect(transport);
  log(`servidor MCP listo (protocolo ${PROTOCOL_VERSION}, ${TIMER_TOOLS.length} herramientas)`);
}

main().catch((error) => {
  log(`error fatal: ${error?.stack ?? error}`);
  process.exit(1);
});
