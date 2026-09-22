import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setTimeout as delay } from 'node:timers/promises';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import WebSocket from 'ws';

const PORT = 8799;

let client;
let tab;
const received = [];

const settle = () => delay(200);

const textOf = (result) => result.content.map((part) => part.text ?? '').join(' ');

beforeAll(async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['mcp/server.mjs', '--port', String(PORT)],
    cwd: process.cwd(),
    stderr: 'ignore'
  });

  client = new Client({ name: 'vitest', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
});

afterAll(async () => {
  if (tab) tab.close();
  if (client) await client.close();
});

describe('mcp/server.mjs', () => {
  it('expone las 14 herramientas del catálogo', async () => {
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(14);
    expect(tools.map((tool) => tool.name)).toContain('timer_set_sections');
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it('explica qué hacer cuando no hay ninguna pestaña conectada', async () => {
    const result = await client.callTool({ name: 'timer_get_state', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/No hay ninguna pestaña conectada/);
    expect(textOf(result)).toMatch(/npm run dev/);
  });

  it('rechaza un Origin que no sea local antes de aceptar la pestaña', async () => {
    const evil = new WebSocket(`ws://127.0.0.1:${PORT}`, { origin: 'https://evil.example.com' });
    const rejected = await new Promise((resolve) => {
      evil.once('open', () => resolve(false));
      evil.once('error', () => resolve(true));
    });

    expect(rejected).toBe(true);
  });

  it('acepta una pestaña local y le reenvía los argumentos tal cual', async () => {
    tab = new WebSocket(`ws://127.0.0.1:${PORT}`, { origin: 'http://localhost:8080' });
    await new Promise((resolve, reject) => {
      tab.once('open', resolve);
      tab.once('error', reject);
    });

    tab.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== 'command') return;
      received.push(message);
      tab.send(
        JSON.stringify({ type: 'result', id: message.id, ok: true, value: { echoed: message.name, args: message.args } })
      );
    });

    await settle();

    const result = await client.callTool({
      name: 'timer_set_sections',
      arguments: { sections: [{ name: 'Intro', duration: '3m' }, { name: 'Demo', duration: 600 }] }
    });

    expect(result.isError).toBeFalsy();
    expect(received.at(-1).name).toBe('timer_set_sections');
    // The server must not normalise: durations travel verbatim so the browser
    // command layer is the single place that interprets them.
    expect(received.at(-1).args.sections[0].duration).toBe('3m');
    expect(received.at(-1).args.sections[1].duration).toBe(600);
  });

  it('deja pasar una duración malformada para que la valide el navegador', async () => {
    const result = await client.callTool({ name: 'timer_add_section', arguments: { name: 'X', duration: 'nope' } });

    expect(result.isError).toBeFalsy();
    expect(received.at(-1).args.duration).toBe('nope');
  });

  it('resuelve el salto por nombre y por índice', async () => {
    const byName = await client.callTool({ name: 'timer_jump_to_section', arguments: { name: 'Demo' } });
    expect(byName.isError).toBeFalsy();
    expect(received.at(-1).args).toEqual({ name: 'Demo' });

    const byIndex = await client.callTool({ name: 'timer_jump_to_section', arguments: { index: 1 } });
    expect(byIndex.isError).toBeFalsy();
    expect(received.at(-1).args).toEqual({ index: 1 });
  });

  it('vuelve al error accionable cuando la pestaña se desconecta', async () => {
    tab.close();
    await settle();

    const result = await client.callTool({ name: 'timer_get_state', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/No hay ninguna pestaña conectada/);
  });
});
