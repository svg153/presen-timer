# STRUCTURE — presen-timer

```
presen-timer/
├─ .github/
│  └─ workflows/deploy-pages.yml     # build + despliegue a GitHub Pages
├─ .planning/                        # artefactos GSD (este árbol)
├─ public/
│  ├─ favicon.ico
│  ├─ notification.mp3               # placeholder de texto (149 bytes) — ver CONCERNS
│  ├─ og-image.png
│  └─ placeholder.svg
├─ src/
│  ├─ components/
│  │  ├─ Footer.tsx
│  │  ├─ Navbar.tsx
│  │  ├─ ProgressBar.tsx
│  │  ├─ SectionInput.tsx
│  │  ├─ SectionsList.tsx
│  │  ├─ TimerControls.tsx
│  │  ├─ TimerSection.tsx
│  │  └─ ui/                         # componentes shadcn/ui (48 ficheros)
│  ├─ hooks/
│  │  ├─ use-mobile.tsx
│  │  ├─ use-toast.ts
│  │  └─ useTimer.ts                 # ★ núcleo del temporizador
│  ├─ lib/utils.ts                   # helper `cn` de shadcn
│  ├─ pages/
│  │  ├─ Index.tsx                   # ★ pantalla principal
│  │  └─ NotFound.tsx
│  ├─ utils/timerUtils.ts            # ★ parseo, formato, progreso, localStorage
│  ├─ App.css
│  ├─ App.tsx                        # providers + router
│  ├─ index.css
│  ├─ main.tsx                       # punto de entrada
│  └─ vite-env.d.ts
├─ components.json                   # configuración de shadcn
├─ eslint.config.js
├─ index.html
├─ package.json / package-lock.json / bun.lockb
├─ postcss.config.js
├─ tailwind.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
└─ vite.config.ts
```

## Ficheros que toca la fase 01

| Fichero | Cambio |
|---------|--------|
| `shared/mcp-protocol.js` | **Nuevo** — protocolo compartido |
| `shared/mcp-protocol.d.ts` | **Nuevo** — tipos del protocolo |
| `mcp/server.mjs` | **Nuevo** — servidor MCP + puente WebSocket |
| `src/mcp/commands.ts` | **Nuevo** — mapeo comando → acción |
| `src/mcp/useMcpBridge.ts` | **Nuevo** — puente en el navegador |
| `src/components/McpBridgeStatus.tsx` | **Nuevo** — indicador y ayuda |
| `src/pages/Index.tsx` | Montar el puente y el indicador |
| `package.json` | Dependencias y scripts `mcp` / `test` |
| `README.md` | Sección de MCP |

## Convenciones de tamaño

- Componentes de la app: 1 fichero por componente, exportación por defecto.
- `src/components/ui/` es territorio de shadcn: no se edita a mano salvo necesidad.
- No hay ficheros de barril (`index.ts`); las importaciones son siempre directas.
