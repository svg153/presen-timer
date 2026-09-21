---
gsd_state_version: 1
status: phase_01_complete
phase: 01-local-mcp-bridge
progress: 31/31
---

# STATE — presen-timer

## Project Reference

Temporizador de presentaciones 100 % cliente. Ver `.planning/PROJECT.md`.
Repositorio público, demo estática en <https://svg153.github.io/presen-timer/>.

## Current Position

- **Fase activa:** 01 — `01-local-mcp-bridge` (**implementada y verificada**, pendiente de merge)
- **Plan activo:** `01-01-PLAN.md`
- **Estado:** T1 … T8 completadas; `npm run test:e2e` en verde (23/23)
- **Bloqueos:** ninguno

## Performance Metrics

- Requisitos v1: 31
- Requisitos v1 completados: 31
- Fases completadas: 1 / 4
- PRs abiertos: 0

## Accumulated Context

### Restricciones que condicionan el diseño

1. Una página **HTTPS no puede** abrir `ws://localhost` (contenido mixto, sin excepción fiable).
   Por eso el control remoto de la fase 01 solo funciona desde `http://localhost`.
2. El **navegador no puede ser servidor MCP**; siempre es la parte controlada.
3. **MCP no define autenticación.** El token solo hace falta si el servidor está expuesto en internet.
   Un puente en loopback no lo necesita.
4. **WebMCP** existe (`document.modelContext`, origin trial en Chrome 149) pero solo lo invoca el agente
   del navegador, no Claude Code ni Copilot, y solo en Chrome.
5. `requestFullscreen()` exige un gesto de usuario → no se puede controlar por MCP.

### Decisiones clave

Ver la tabla de decisiones en `.planning/PROJECT.md` (D-01 … D-09).

### Lecciones aprendidas en la fase 01

- `tsconfig.app.json` usa `strict: false`, lo que implica `strictNullChecks: false`. TypeScript **solo**
  estrecha uniones discriminadas por literal booleano cuando `strictNullChecks` está activo: por eso
  `ApplyResult` es una interfaz plana con `ok: boolean` en lugar de una unión.
- `inputSchema` de `registerTool` es un `ZodRawShape` plano, **no** un `z.object({...})`.
- Un argumento tipado `z.union([z.string(), z.number()])` no puede validar el formato de la duración;
  la validación ocurre en el navegador, que es quien devuelve el error en español.
- `timer_add_time` suma a la cuenta atrás, **nunca** a la duración configurada de la sección.
- La conexión vive en un singleton a nivel de módulo (`src/mcp/bridgeConnection.ts`), no en el hook: así
  una sola pestaña mantiene exactamente un socket aunque React remonte el componente.
- El backoff de reconexión baja hasta 4 s (20 s si la pestaña está oculta) para que arrancar
  `npm run mcp` con la app abierta se note enseguida.

### Deuda técnica conocida

- `public/notification.mp3` es un placeholder de texto: el aviso sonoro falla en silencio.
- 55 avisos abiertos de Dependabot (24 altos, 27 moderados, 4 bajos) repartidos en 19 paquetes
  transitivos de desarrollo y build (`esbuild`, `vite`, `rollup`, `lodash`, `postcss`,
  `brace-expansion`…). `npm audit` reporta 25 porque cuenta avisos únicos en el árbol resuelto,
  mientras que Dependabot cuenta una alerta por cada par aviso/paquete afectado.
- 7 avisos de ESLint preexistentes (`react-refresh/only-export-components`): seis en el scaffold
  de shadcn y uno en `src/i18n/index.tsx` (lo añadió la PR #17 en `main`). Los 3 errores que había
  antes los corrigió la PR #5 en `main`; esta fase no añade ni un aviso nuevo.
- El typecheck no está en el pipeline: `"build": "vite build"` no ejecuta `tsc`, así que
  `src/i18n/index.tsx` usaba `String.prototype.replaceAll` (ES2021) con `lib: ["ES2020", …]` y
  `npx tsc --noEmit` fallaba con TS2550 sin que CI lo notara. Corregido subiendo `lib` a `ES2021`
  al rebasar esta fase sobre `main`. Pendiente: añadir `tsc --noEmit` y `npm run test` a `ci.yml`.
- Sin reducer puro: la lógica del temporizador vive dentro del hook y no es directamente testeable.
  La PR #6 ya extrajo `secondsLeftFromEnd` a `src/utils/timerUtils.ts` y esta fase la cubre con pruebas.
- `eslint.config.js` solo cubre `**/*.{ts,tsx}`, así que `mcp/*.mjs` y `shared/*.js` no se lintan.

## Deferred Items

- Fase 02 (MCP remoto en Vercel + Upstash Redis).
- Fase 03 (WebMCP).
- Fase 04 (endurecimiento).
- Instalar realmente GSD Core (`.planning/onboarding/SUMMARY.md`).

## Session Continuity

- **Rama de trabajo:** worktree de sesión sobre `main` de `svg153/presen-timer`.
- **Deriva de `main`:** mientras se trabajaba en la fase 01, `main` avanzó **20 commits / 12 PRs
  mergeadas** (#5–#17, todas aditivas, ninguna revertida): P0-2 overtime, P0-3 atajos, P0-4 edición
  de secciones, P1-5 presets con nombre, P1-6 import/export JSON, P1-7 PWA + Wake Lock, P1-8 modo
  presentador, P2-9 estadísticas, P2-10 plantillas de fábrica, P2-11 i18n ES/EN + tema claro/oscuro
  y #18 (ticket de decisión del mando remoto). La PR #8 se rebasó sobre `976ed46`; los conflictos
  fueron solo en `docs/ROADMAP.md`, `package.json`, `package-lock.json` y `src/pages/Index.tsx`.
- **Último hito:** fase 01 implementada y verificada end-to-end (23/23); 60 pruebas unitarias en verde.
- **Siguiente paso:** mergear la fase 01 y, cuando el usuario quiera, arrancar la fase 02.
