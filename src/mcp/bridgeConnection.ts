import {
  BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  MESSAGE,
  PROTOCOL_VERSION,
  helloMessage,
  parseBridgeMessage,
  resultMessage,
  stateMessage
} from '../../shared/mcp-protocol';
import { applyCommand, buildSnapshot } from './commands';
import type { CommandEnvelope } from '../../shared/mcp-protocol';
import type { TimerActions, TimerLiveState } from './commands';

export type BridgeStatus = 'idle' | 'connecting' | 'connected' | 'unavailable' | 'error';

export interface McpBridge {
  status: BridgeStatus;
  sessionId: string | null;
  lastError: string | null;
  url: string;
  reconnect: () => void;
}

export interface BridgeSnapshot {
  status: BridgeStatus;
  sessionId: string | null;
  lastError: string | null;
}

const RECONNECT_MIN_MS = 1000;
/** A loopback retry is almost free, so keep the ceiling low: the user should
 *  not wait 30s after starting `npm run mcp` behind the page's back. */
const RECONNECT_MAX_MS = 4000;
/** With no server running the browser logs a failed-connection error on every
 *  attempt, so when the tab is hidden (nobody watching, DevTools likely open)
 *  slow down instead of spamming the console. Becoming visible again nudges an
 *  immediate retry, so the snappy case is unaffected. */
const RECONNECT_HIDDEN_MAX_MS = 20000;
const HANDLED_MEMORY = 50;

export const MIXED_CONTENT_REASON =
  'Esta página se sirve por HTTPS y el navegador bloquea las conexiones a ws://localhost. Abre la app en http://localhost:8080/presen-timer/ para usar el puente MCP.';

/** `ws://127.0.0.1:8765`, overridable with `?mcpPort=NNNN` to match `npm run mcp -- --port`. */
export function resolveBridgeUrl(search: string = window.location.search): string {
  const raw = new URLSearchParams(search).get('mcpPort');
  const parsed = raw && /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : DEFAULT_BRIDGE_PORT;
  const port = parsed > 0 && parsed < 65536 ? parsed : DEFAULT_BRIDGE_PORT;
  return `ws://${BRIDGE_HOST}:${port}`;
}

/*
 * The bridge is a per-tab singleton: one socket, shared by every consumer. Keeping
 * the connection out of React state means a remount, a hot reload or a second
 * consumer can never open a duplicate socket — and therefore can never apply the
 * same agent command twice.
 */
let socket: WebSocket | null = null;
let retryTimer: number | null = null;
let attempt = 0;
let consumers = 0;
let url: string | null = null;

let snapshot: BridgeSnapshot = { status: 'idle', sessionId: null, lastError: null };
const listeners = new Set<() => void>();

/** A getter, not a snapshot: commands always act on the newest timer state. */
let timerSource: (() => TimerLiveState & TimerActions) | null = null;
const replies = new Map<string, CommandEnvelope>();

function emit(): void {
  listeners.forEach(listener => listener());
}

function patch(next: Partial<BridgeSnapshot>): void {
  const merged = { ...snapshot, ...next };
  if (
    merged.status === snapshot.status &&
    merged.sessionId === snapshot.sessionId &&
    merged.lastError === snapshot.lastError
  ) {
    return;
  }
  snapshot = merged;
  emit();
}

export function getBridgeSnapshot(): BridgeSnapshot {
  return snapshot;
}

export function subscribeToBridge(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bridgeUrl(): string {
  if (url === null) url = resolveBridgeUrl();
  return url;
}

export function setTimerSource(source: (() => TimerLiveState & TimerActions) | null): void {
  timerSource = source;
}

/** Registers a consumer. The socket opens on the first one and closes with the last. */
export function acquireBridge(): void {
  consumers += 1;
  if (consumers > 1) return;

  if (window.location.protocol === 'https:') {
    patch({ status: 'unavailable', lastError: MIXED_CONTENT_REASON });
    return;
  }

  connect();
}

export function releaseBridge(): void {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0) return;

  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  const stale = socket;
  socket = null;
  if (stale) {
    stale.onopen = null;
    stale.onmessage = null;
    stale.onclose = null;
    try {
      stale.close();
    } catch {
      /* already closing */
    }
  }
  patch({ status: 'idle', sessionId: null });
}

function send(message: unknown): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function publishState(): void {
  if (timerSource) send(stateMessage(buildSnapshot(timerSource())));
}

/** Pushes the current snapshot so `timer_get_state` never answers from stale data. */
export function publishBridgeState(): void {
  publishState();
}

function handleCommand(id: string, name: string, args: Record<string, unknown> | undefined): void {
  const cached = replies.get(id);
  if (cached) {
    // Already applied through another path; replay the answer instead of acting twice.
    send(resultMessage({ id, ok: true, value: cached }));
    return;
  }

  if (!timerSource) {
    send(resultMessage({ id, ok: false, error: 'La aplicación todavía no está lista. Inténtalo de nuevo.' }));
    return;
  }

  const timer = timerSource();
  const result = applyCommand(name, args, timer, timer);

  if (!result.ok) {
    send(resultMessage({ id, ok: false, error: result.error ?? 'Error desconocido.' }));
    return;
  }

  if (result.value) {
    replies.set(id, result.value);
    if (replies.size > HANDLED_MEMORY) {
      const oldest = replies.keys().next().value;
      if (oldest !== undefined) replies.delete(oldest);
    }
  }
  send(resultMessage({ id, ok: true, value: result.value }));
}

function handleMessage(event: MessageEvent): void {
  const message = parseBridgeMessage(typeof event.data === 'string' ? event.data : '');
  if (!message) return;

  if (message.type === MESSAGE.WELCOME) {
    patch({ sessionId: message.sessionId, lastError: null });
    publishState();
    return;
  }

  if (message.type === MESSAGE.COMMAND) {
    handleCommand(message.id, message.name, message.args);
  }
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  const ceiling =
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
      ? RECONNECT_HIDDEN_MAX_MS
      : RECONNECT_MAX_MS;
  const delay = Math.min(RECONNECT_MIN_MS * 2 ** attempt, ceiling);
  attempt += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    connect();
  }, delay);
}

function connect(): void {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

  patch({ status: 'connecting' });

  const ws = new WebSocket(bridgeUrl());
  socket = ws;

  ws.onopen = () => {
    attempt = 0;
    patch({ status: 'connected', lastError: null });
    send(helloMessage({ client: { name: 'presen-timer-web', version: '1.0.0' }, protocolVersion: PROTOCOL_VERSION }));
  };

  ws.onmessage = handleMessage;

  ws.onclose = () => {
    if (socket === ws) socket = null;
    if (consumers === 0) return;
    patch({ status: 'connecting', sessionId: null });
    scheduleRetry();
  };
}

/** Drops the current socket and dials again immediately, skipping the backoff. */
export function reconnectBridge(): void {
  attempt = 0;
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (socket) {
    const stale = socket;
    socket = null;
    stale.onopen = null;
    stale.onmessage = null;
    stale.onclose = null;
    try {
      stale.close();
    } catch {
      /* already closing */
    }
  }
  if (window.location.protocol === 'https:') {
    patch({ status: 'unavailable', lastError: MIXED_CONTENT_REASON });
    return;
  }
  connect();
}

// Coming back to the tab is the moment a freshly started `npm run mcp` becomes
// reachable, so retry at once instead of waiting out the current backoff.
if (typeof window !== 'undefined') {
  const nudge = () => {
    if (consumers === 0) return;
    if (document.visibilityState !== 'visible') return;
    if (socket && socket.readyState === WebSocket.OPEN) return;
    reconnectBridge();
  };
  window.addEventListener('focus', nudge);
  document.addEventListener('visibilitychange', nudge);
}
