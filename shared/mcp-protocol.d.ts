export interface TimerSection {
  name: string;
  duration: number;
}

export interface TimerSectionInput {
  name: string;
  duration: string | number;
}

export interface TimerSnapshot {
  sections: TimerSection[];
  currentSectionIndex: number;
  currentSectionName: string | null;
  timeRemaining: number;
  timeRemainingLabel: string;
  isRunning: boolean;
  isWarning: boolean;
  totalDuration: number;
  totalDurationLabel: string;
  elapsed: number;
  progress: number;
  hasSections: boolean;
}

/** What every tool returns on success: the projected state plus how it changed. */
export interface CommandEnvelope extends TimerSnapshot {
  ok: true;
  command: CommandName;
  changed: boolean;
  note?: string;
}

export type CommandName =
  | 'timer_get_state'
  | 'timer_set_sections'
  | 'timer_add_section'
  | 'timer_update_section'
  | 'timer_remove_section'
  | 'timer_start'
  | 'timer_pause'
  | 'timer_toggle'
  | 'timer_reset_section'
  | 'timer_next_section'
  | 'timer_prev_section'
  | 'timer_jump_to_section'
  | 'timer_add_time'
  | 'timer_end_presentation';

export type ArgType = 'string' | 'integer' | 'duration' | 'sections';

export interface ArgSpec {
  type: ArgType;
  required: boolean;
  description: string;
}

export interface ToolSpec {
  name: CommandName;
  title: string;
  description: string;
  args: Record<string, ArgSpec>;
}

export interface CoerceResult {
  ok: boolean;
  sections?: TimerSection[];
  error?: string;
}

export interface CommandResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export declare const PROTOCOL_VERSION: number;
export declare const BRIDGE_HOST: string;
export declare const DEFAULT_BRIDGE_PORT: number;
export declare const COMMAND_TIMEOUT_MS: number;
export declare const APP_STORAGE_KEY: string;

export declare const MESSAGE: {
  readonly HELLO: 'hello';
  readonly WELCOME: 'welcome';
  readonly STATE: 'state';
  readonly COMMAND: 'command';
  readonly RESULT: 'result';
  readonly PING: 'ping';
};

export declare const COMMANDS: Readonly<Record<string, CommandName>>;
export declare const COMMAND_NAMES: readonly CommandName[];
export declare const TIMER_TOOLS: readonly ToolSpec[];
export declare const TIMER_TOOL_NAMES: readonly CommandName[];

export declare function getTool(name: string): ToolSpec | null;

export declare function parseDuration(value: unknown): number | null;
export declare function coerceSections(raw: unknown): CoerceResult;

export interface HelloMessage {
  type: 'hello';
  protocolVersion: number;
  client: { name: string; version?: string } | null;
}

export interface WelcomeMessage {
  type: 'welcome';
  protocolVersion: number;
  sessionId: string | null;
  server: { name: string; version?: string } | null;
}

export interface StateMessage {
  type: 'state';
  snapshot: TimerSnapshot;
}

export interface CommandMessage {
  type: 'command';
  id: string;
  name: CommandName;
  args: Record<string, unknown>;
}

export interface ResultMessage {
  type: 'result';
  id: string;
  ok: boolean;
  value: unknown;
  error: string | null;
}

export interface PingMessage {
  type: 'ping';
}

export type BridgeMessage =
  | HelloMessage
  | WelcomeMessage
  | StateMessage
  | CommandMessage
  | ResultMessage
  | PingMessage;

export declare function helloMessage(options?: {
  client?: { name: string; version?: string } | null;
  protocolVersion?: number;
}): HelloMessage;

export declare function welcomeMessage(options?: {
  sessionId?: string | null;
  server?: { name: string; version?: string } | null;
}): WelcomeMessage;

export declare function stateMessage(snapshot: TimerSnapshot): StateMessage;

export declare function commandMessage(options: {
  id: string;
  name: CommandName;
  args?: Record<string, unknown>;
}): CommandMessage;

export declare function resultMessage(options: {
  id: string;
  ok: boolean;
  value?: unknown;
  error?: string | null;
}): ResultMessage;

export declare function pingMessage(): PingMessage;

export declare function isBridgeMessage(value: unknown): value is BridgeMessage;
export declare function parseBridgeMessage(raw: unknown): BridgeMessage | null;
