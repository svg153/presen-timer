# AGENTS.md

Guía para agentes de IA (Copilot, Claude Code, Codex, Cursor...) que trabajan en este repositorio. **Lee esto antes de tocar código.**

## Qué es este proyecto

**presen-timer**: temporizador para presentaciones con secciones cronometradas. El usuario define secciones (`Nombre: 5m`), el timer avanza automáticamente entre secciones con avisos sonoros y visuales.

## Stack

- **Build**: Vite 5 + TypeScript 5 (strict)
- **UI**: React 18 + shadcn/ui (Radix) + Tailwind CSS 3
- **Routing**: react-router-dom 6
- **Notificaciones**: sonner (toasts) + Web Audio (`/notification.mp3`)
- **Estado**: `useState`/hooks locales. **No hay estado global** (no Redux/Zustand) — no introducirlo sin necesidad.
- **Gestor de paquetes**: npm (hay `bun.lockb` heredado de Lovable, ignóralo; usa `package-lock.json`)

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # dev server (Vite)
npm run build      # build de producción (valida TS + bundling)
npm run lint       # ESLint
```

No hay tests todavía. **Validación mínima antes de terminar cualquier cambio: `npm run lint && npm run build`.** Cuando se añada Vitest, ejecuta también los tests.

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
└── pages/NotFound.tsx
```

**Flujo de datos**: `Index.tsx` llama a `useTimer()` → pasa estado + callbacks como props a los componentes. Los componentes no mutan estado directamente.

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
