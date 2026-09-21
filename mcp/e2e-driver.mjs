/**
 * Acceptance test for the MCP bridge (TST-04).
 *
 * Acts as a real MCP client: it spawns `mcp/server.mjs` over stdio exactly like
 * Claude Code or Copilot CLI would, waits for a browser tab to attach to the
 * bridge, and then drives the timer through every tool.
 *
 * Prerequisites (this test needs a real browser tab, so it cannot run in CI):
 *   1. `npm run dev`
 *   2. open http://localhost:8080/presen-timer/ and wait for the pill to turn green
 *
 * Then: `npm run test:e2e`
 *
 * The default port must match the page's bridge URL. Override both with
 * `npm run test:e2e -- --port 8801` and `?mcpPort=8801` in the page URL.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEFAULT_PORT = '8765';
const TAB_TIMEOUT_MS = 45_000;

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(
    [
      'Uso: node mcp/e2e-driver.mjs [--port NNNN]',
      '',
      'Necesita la app abierta en http://localhost:8080/presen-timer/',
      'con el indicador del puente en verde. Arranca el servidor MCP por su',
      'cuenta, así que no ejecutes `npm run mcp` a la vez en el mismo puerto.'
    ].join('\n')
  );
  process.exit(0);
}

const PORT = argValue('--port', DEFAULT_PORT);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const checks = [];
let failures = 0;

function check(label, condition, detail) {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  checks.push({ label, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : ` — ${detail}`}`);
}

/** Tool results arrive as JSON text in the first content block. */
function payload(result) {
  const text = result?.content?.find(block => block.type === 'text')?.text ?? '';
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  return { isError: Boolean(result.isError), data: payload(result) };
}

/** The page may still be loading, so poll instead of sleeping a fixed amount. */
async function waitForTab(client, timeoutMs = TAB_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const res = await call(client, 'timer_get_state');
    if (!res.isError) return res.data;
    last = res.data;
    await sleep(1000);
  }
  throw new Error(`ninguna pestaña se conectó al puente en ${timeoutMs / 1000}s: ${JSON.stringify(last)}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['mcp/server.mjs', '--port', PORT],
  cwd: process.cwd(),
  stderr: 'inherit'
});

const client = new Client({ name: 'presen-timer-e2e', version: '1.0.0' });
await client.connect(transport);

console.log(`\n=== esperando la pestaña en el puerto ${PORT} ===`);
console.log('estado inicial:', JSON.stringify(await waitForTab(client)));

const tools = await client.listTools();
check('se exponen las 14 herramientas', tools.tools.length === 14, `${tools.tools.length}`);

// --- 1. estructura remota: el caso central ----------------------------------
const setRes = await call(client, 'timer_set_sections', {
  sections: [
    { name: 'Apertura', duration: '2m' },
    { name: 'Kata', duration: '10m' },
    { name: 'Cierre', duration: '1m' }
  ]
});
check('timer_set_sections acepta una estructura nueva', !setRes.isError);
check(
  'timer_set_sections devuelve la estructura aplicada',
  setRes.data?.sections?.length === 3 && setRes.data.sections[1].name === 'Kata',
  JSON.stringify(setRes.data?.sections)
);
check('la duración "2m" se normaliza a 120 s', setRes.data?.sections?.[0]?.duration === 120, `${setRes.data?.sections?.[0]?.duration}`);
check('el total se recalcula a 13:00', setRes.data?.totalDurationLabel === '13:00', `${setRes.data?.totalDurationLabel}`);
check('el índice vuelve a 0', setRes.data?.currentSectionIndex === 0, `${setRes.data?.currentSectionIndex}`);

const afterSet = await call(client, 'timer_get_state');
check(
  'timer_get_state refleja la nueva estructura',
  afterSet.data?.sections?.length === 3 && afterSet.data?.currentSectionName === 'Apertura',
  `${afterSet.data?.currentSectionName} / ${afterSet.data?.totalDurationLabel}`
);

// --- 2. arranque y cuenta atrás ---------------------------------------------
await call(client, 'timer_start');
const started = await call(client, 'timer_get_state');
check('timer_start marca isRunning', started.data?.isRunning === true, `${started.data?.isRunning}`);
await sleep(2500);
const ticked = await call(client, 'timer_get_state');
check(
  'la cuenta atrás avanza sola',
  typeof ticked.data?.timeRemaining === 'number' && ticked.data.timeRemaining < started.data.timeRemaining,
  `${started.data?.timeRemaining} -> ${ticked.data?.timeRemaining}`
);

// --- 3. navegación ----------------------------------------------------------
await call(client, 'timer_next_section');
const next = await call(client, 'timer_get_state');
check('timer_next_section avanza a Kata', next.data?.currentSectionName === 'Kata', `${next.data?.currentSectionName}`);

await call(client, 'timer_prev_section');
const prev = await call(client, 'timer_get_state');
check('timer_prev_section vuelve a Apertura', prev.data?.currentSectionName === 'Apertura', `${prev.data?.currentSectionName}`);

const jump = await call(client, 'timer_jump_to_section', { name: 'cierre' });
check('timer_jump_to_section por nombre ignora mayúsculas', !jump.isError, `${jump.data?.currentSectionName}`);

const jumpBad = await call(client, 'timer_jump_to_section', { name: 'no-existe' });
check('saltar a una sección inexistente devuelve error', jumpBad.isError === true, JSON.stringify(jumpBad.data).slice(0, 120));

// --- 4. edición fina de la estructura ---------------------------------------
const add = await call(client, 'timer_add_section', { name: 'Ruegos', duration: 300 });
check('timer_add_section añade al final', add.data?.sections?.length === 4 && add.data?.sections?.[3]?.name === 'Ruegos', `${add.data?.sections?.length}`);

const upd = await call(client, 'timer_update_section', { index: 3, duration: '2m' });
check('timer_update_section cambia la duración', upd.data?.sections?.[3]?.duration === 120, `${upd.data?.sections?.[3]?.duration}`);

const rm = await call(client, 'timer_remove_section', { index: 3 });
check('timer_remove_section quita la sección', rm.data?.sections?.length === 3, `${rm.data?.sections?.length}`);

// addExtraTime extends the countdown, not the section's configured duration.
const beforeAddTime = await call(client, 'timer_get_state');
const addTime = await call(client, 'timer_add_time', { duration: '1m' });
check(
  'timer_add_time suma 1m a la cuenta atrás',
  addTime.data?.timeRemaining === beforeAddTime.data.timeRemaining + 60,
  `${beforeAddTime.data?.timeRemaining} -> ${addTime.data?.timeRemaining}`
);
check(
  'timer_add_time no altera la duración configurada ni el total',
  addTime.data?.totalDurationLabel === beforeAddTime.data?.totalDurationLabel,
  `${addTime.data?.totalDurationLabel}`
);

// --- 5. validación ----------------------------------------------------------
const badDuration = await call(client, 'timer_add_section', { name: 'X', duration: 'nope' });
check('una duración inválida devuelve error', badDuration.isError === true, JSON.stringify(badDuration.data).slice(0, 120));

const badIndex = await call(client, 'timer_remove_section', { index: 99 });
check('un índice fuera de rango devuelve error', badIndex.isError === true, JSON.stringify(badIndex.data).slice(0, 120));

// --- 6. pausa, reset y fin --------------------------------------------------
await call(client, 'timer_pause');
const paused = await call(client, 'timer_get_state');
check('timer_pause detiene la cuenta', paused.data?.isRunning === false, `${paused.data?.isRunning}`);

await call(client, 'timer_reset_section');
const reset = await call(client, 'timer_get_state');
check('timer_reset_section vuelve al inicio de la sección', reset.data?.currentSectionIndex === 0, `${reset.data?.currentSectionIndex}`);

const end = await call(client, 'timer_end_presentation');
check('timer_end_presentation responde', !end.isError);

const finalState = await call(client, 'timer_get_state');
console.log('\nESTADO FINAL:', JSON.stringify(finalState.data, null, 1));

console.log(`\n=== ${checks.length - failures}/${checks.length} comprobaciones correctas ===`);
await client.close();
process.exit(failures === 0 ? 0 : 1);
