# AGENTS.md

Guía para agentes de IA (Copilot, Claude Code, Codex, Cursor...) que trabajan en este repositorio. **Lee esto antes de tocar código.**

## Qué es este proyecto

**presen-timer**: temporizador para presentaciones con secciones cronometradas. El usuario define secciones (`Nombre: 5m`), el timer avanza automáticamente entre secciones con avisos sonoros y visuales.

## Stack

- **Build**: Vite 8 + TypeScript 5 (`tsconfig.app.json` tiene `strict: false` — ojo: sin `strictNullChecks` TypeScript **no** estrecha uniones discriminadas por un literal booleano)
- **UI**: React 18 + shadcn/ui (Radix) + Tailwind CSS 3
- **Routing**: react-router-dom 7
- **Notificaciones**: sonner (toasts) + Web Audio (`/notification.wav`)
- **Estado**: `useState`/hooks locales. **No hay estado global** (no Redux/Zustand) — no introducirlo sin necesidad.
- **Gestor de paquetes**: npm (hay `bun.lockb` heredado de Lovable, ignóralo; usa `package-lock.json`)

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # dev server (Vite)
npm run typecheck  # tsc --noEmit sobre tsconfig.app.json y tsconfig.node.json
npm run build      # build de producción (bundling; NO comprueba tipos)
npm run lint       # ESLint
npm run test       # Vitest (unitarios de src/ y mcp/)
npm run test:e2e   # aceptación del puente MCP (necesita un navegador abierto)
npm run mcp        # arranca el servidor MCP local (stdio + puente WebSocket)
```

**Validación mínima antes de terminar cualquier cambio: `npm run lint && npm run typecheck && npm run test && npm run build`.** Ojo: `npm run build` es `vite build` a secas, **no** comprueba tipos — para eso está `npm run typecheck`, que además es un paso obligatorio de CI (`.github/workflows/ci.yml`). Los tests son Vitest (`vitest.config.ts`, entorno `node`) sobre `src/**/*.test.ts` y `mcp/**/*.test.mjs`. `npm run test:e2e` es la prueba de aceptación del puente MCP y necesita un navegador con la app abierta, por eso no corre en CI.

## Mapa de arquitectura

```
src/
├── hooks/useTimer.ts        ← NÚCLEO: todo el estado del timer vive aquí
├── hooks/useGitHubRepos.ts  ← fetch repos GitHub: ETag/304, throttle 10min, refresco auto (P2-13)
├── utils/timerUtils.ts      ← funciones PURAS (parse, format, cálculos, localStorage)
├── utils/githubUtils.ts     ← funciones PURAS GitHub: parseo repo, storage, ETag/sha, base64 (P2-13)
├── components/              ← componentes presentacionales (reciben props, sin estado de timer)
│   ├── TimerSection.tsx     ← pantalla principal del timer
│   ├── TimerControls.tsx    ← botones play/pause/reset/next/prev/fullscreen
│   ├── SectionsList.tsx     ← sidebar con lista de secciones
│   ├── SectionInput.tsx     ← textarea para definir secciones
│   ├── GitHubImport.tsx     ← panel para cargar presets desde un repo público (P2-13)
│   ├── Navbar.tsx / Footer.tsx / ProgressBar.tsx
│   └── ui/                  ← ⛔ NO EDITAR: componentes shadcn generados
├── pages/Index.tsx          ← orquestador: conecta useTimer con componentes
├── mcp/                     ← puente MCP (solo cliente; no abre sockets propios por componente)
│   ├── commands.ts          ← aplica las 14 herramientas sobre la API de useTimer (sin transporte)
│   └── bridgeConnection.ts  ← singleton por pestaña: un único WebSocket + memoria de respuestas
└── pages/NotFound.tsx

mcp/                         ← lado Node (fuera de src/, no entra en el bundle del navegador)
├── server.mjs               ← servidor MCP por stdio + puente WebSocket en 127.0.0.1
└── e2e-driver.mjs           ← prueba de aceptación end-to-end

shared/mcp-protocol.js       ← contrato sin dependencias (14 herramientas), fuente de verdad
```

**Flujo de datos**: `Index.tsx` llama a `useTimer()` → pasa estado + callbacks como props a los componentes. Los componentes no mutan estado directamente. `useMcpBridge(timer)` expone ese mismo objeto `timer` a un servidor MCP local a través de `bridgeConnection`, que es un singleton de módulo: **una sola conexión por pestaña**, independiente de cuántas veces se monte el hook.

## Convenciones

- Alias de importación: `@/` → `src/`
- Componentes: PascalCase, export default
- Hooks: prefijo `use`, en `src/hooks/`
- Funciones puras y helpers: `src/utils/` (mantén `timerUtils.ts` libre de React — así es testeable)
- Tipos compartidos: exporta interfaces desde donde se definen (p. ej. `TimerSection` en `useTimer.ts`)
- Estilos: clases Tailwind; tokens de color custom definidos en `tailwind.config.ts` (`github-*`, `glass-card`, `timer-text`)
- Contenido de UI por defecto en **español** (el usuario del repo es hispanohablante); código e identificadores en inglés
- Commits: mensajes cortos en inglés, imperativo ("Add keyboard shortcuts")

## Reglas para agentes

1. **No edites `src/components/ui/`** — es código shadcn generado. Si necesitas variante, usa las props existentes o crea un componente wrapper en `src/components/`.
2. **El estado del timer solo en `useTimer`**. Si una feature necesita nuevo estado, añádelo al hook, no a los componentes.
3. **Lógica de tiempo/cálculo en `timerUtils.ts`** como funciones puras.
4. No añadas dependencias sin justificarlo; prefiere lo que ya está en `package.json`.
5. No toques `bun.lockb` ni la config de Lovable (`lovable-tagger` en vite.config.ts).
6. Valida con `npm run lint && npm run build` antes de dar por terminada la tarea.
7. Si una decisión requiere elegir entre opciones con impacto en la arquitectura, documéntala con el marcador `[AI-DECISION]` en el issue/PR correspondiente (ver issue #4) y continúa con la opción recomendada.

## Skills y agentes disponibles

- **Skills** (`.github/skills/`): flujos de trabajo reutilizables
  - `timer-feature` — cómo añadir una feature al timer de principio a fin
  - `release` — versionar, taggear y verificar build
- **Agente personalizado** (`.github/agents/`): `presen-timer-dev` — desarrollador especialista en este repo (solo Copilot CLI/app)
- **Roadmap**: `docs/ROADMAP.md` — features priorizadas con specs accionables. Empieza por P0.

## Recursos

- Issue de decisiones IA: #4 (marcador `[AI-DECISION]`)
- CI: `.github/workflows/ci.yml` (lint + build en push/PR a main)
