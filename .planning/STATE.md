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

- ~~`public/notification.mp3` es un placeholder de texto~~ — **resuelto**: ahora es `public/notification.wav`
  (22 350 bytes, WAV PCM, CC0 vía [`akx/Notifications`](https://github.com/akx/Notifications)).
- ~~53 avisos abiertos de Dependabot (22 altos, 27 moderados, 4 bajos) en 17 paquetes transitivos~~
  — **resuelto**: `npm audit` pasó de **23 a 0**. El `npm update` + la subida a
  `vite@8` / `vitest@5` / `react-router-dom@7` / `@vitejs/plugin-react-swc@4` eliminaron el árbol
  vulnerable entero (`esbuild`, `vite`, `lodash`, `postcss`, `brace-expansion`…), no solo lo parchearon.
- 7 avisos de ESLint preexistentes (`react-refresh/only-export-components`): seis en el scaffold
  de shadcn y uno en `src/i18n/index.tsx` (lo añadió la PR #17 en `main`). Los 3 errores que había
  antes los corrigió la PR #5 en `main`; esta fase no añade ni un aviso nuevo.
- ~~El typecheck no está en el pipeline~~ — **resuelto**: hay un script `npm run typecheck`
  (`tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`) y `ci.yml` lo ejecuta
  junto con `npm run test`. De paso se corrigió el TS2550 que arrastraba `main`
  (`src/i18n/index.tsx` usaba `replaceAll` con `lib: ["ES2020"]`; ahora `lib: ES2021`).
- **Node ≥ 22 es obligatorio**: `vite@8` exige `^20.19.0 || >=22.12.0` y `vitest@5` exige
  `^22.12.0 || ^24.0.0 || >=26.0.0`. `ci.yml` y `deploy-pages.yml` fijan ya `node-version: 22`.
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
- **Último hito:** fase 01 implementada y verificada end-to-end (23/23); 67 pruebas unitarias en verde;
  dependencias al día con `npm audit` en **0**; typecheck y tests ya en CI.
- **Siguiente paso:** mergear la fase 01 y, cuando el usuario quiera, arrancar la fase 02.
