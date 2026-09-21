---
phase: 01-local-mcp-bridge
status: in_progress
depends_on: []
requirements: [MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, MCP-10, MCP-11, MCP-12, MCP-13, BRG-01, BRG-02, BRG-03, BRG-04, BRG-05, BRG-06, SEC-01, SEC-02, SEC-03, UI-01, UI-02, UI-03, DOC-01, DOC-02, DOC-03, TST-01, TST-02, TST-03, TST-04, TST-05]
---

# CONTEXT — Fase 01: puente MCP local

## Domain

Control remoto de una aplicación web puramente cliente mediante un agente conversacional, sin
infraestructura en la nube.

El problema de fondo: la aplicación vive entera en la pestaña del navegador y no expone ningún punto de
entrada. Se quiere que un agente pueda **definir la estructura de la presentación** y **gobernar el
temporizador** durante la charla. Como el navegador no puede actuar como servidor MCP, hace falta un
proceso intermedio que hable MCP por un lado y con la pestaña por otro.

## Decisions

| ID | Decisión | Motivo |
|----|----------|--------|
| D-01 | El servidor MCP es un proceso **local por stdio**, lanzado por el cliente MCP | No hay que alojar nada; sin superficie de red |
| D-02 | El puente navegador ↔ servidor es un **WebSocket en `127.0.0.1`** | Enlace a loopback; sin exposición pública |
| D-03 | **Sin autenticación** en v1 | No hay endpoint público que proteger; exigir un token solo añadiría fricción |
| D-04 | **GitHub Pages se queda como está**, como demo estática | Ya funciona y no cuesta nada; romperla no aporta |
| D-05 | El MCP remoto por HTTP se pospone a la **fase 02** | Es un trabajo distinto, con estado compartido y control de acceso |
| D-06 | WebMCP se pospone a la **fase 03** | Solo Chrome y solo su agente integrado |
| D-07 | Los artefactos de GSD se escriben **a mano** | El instalador añadiría miles de ficheros a un repositorio público |
| D-08 | **Capa de comandos independiente del transporte** | El mismo comando sirve para stdio hoy y HTTP mañana |
| D-09 | **No** se expone `timer_toggle_fullscreen` | La API de pantalla completa exige gesto de usuario |

Detalle completo en `.planning/PROJECT.md` (tabla D-01…D-09).

## Canonical refs

| Referencia | Qué contiene |
|------------|--------------|
| `.planning/PROJECT.md` | Definición del proyecto y decisiones |
| `.planning/REQUIREMENTS.md` | Los 31 requisitos de v1 |
| `.planning/ROADMAP.md` | Las 4 fases |
| `.planning/FEATURES.md` | Catálogo de funcionalidades |
| `.planning/research/MCP-RESEARCH.md` | Investigación: transportes, SDK, contenido mixto, WebMCP, Vercel |
| `.planning/codebase/ARCHITECTURE.md` | Cómo está montada la app hoy |
| `.planning/codebase/INTEGRATIONS.md` | El contrato de la integración que se va a construir |
| `.planning/codebase/CONCERNS.md` | Riesgos y deudas |
| `src/hooks/useTimer.ts` | Todos los callbacks que hay que gobernar |
| `src/utils/timerUtils.ts` | Formato `Nombre: 5m`, parseo y persistencia |

## Code context

### Lo que ya existe y se reutiliza

- `parseTimeString` acepta `5m` y `1h`; devuelve 0 si no encaja.
- `parseSections` convierte una línea `Nombre: 5m` por línea; descarta duraciones ≤ 0.
- `formatTime`, `calculateTotalDuration`, `calculateProgress` para presentar el estado.
- `STORAGE_KEY` y `saveToLocalStorage` para la persistencia.
- `useTimer` devuelve el estado y los callbacks `setSections`, `toggleTimer`, `resetSection`,
  `nextSection`, `prevSection`, `jumpToSection`, `addExtraTime`, `endPresentation`.

### Lo que hay que tener en cuenta

- `setSections` reinicia el índice a 0, fija el tiempo a la primera sección, **para el temporizador** y
  guarda en `localStorage`. Es el efecto que espera `timer_set_sections`.
- `nextSection` y `prevSection` **no** cambian `isRunning`.
- `resetSection` y `jumpToSection` **sí** paran el temporizador (`isRunning: false`).
- `endPresentation` para el temporizador y muestra un aviso.
- `toggleFullscreen` exige gesto de usuario: no se expone.

### Puntos de montaje

- `src/pages/Index.tsx` monta el puente y pasa los callbacks.
- `src/components/Navbar.tsx` es el sitio natural para el indicador de estado.

## Constraints

1. **Contenido mixto:** una página HTTPS no puede abrir `ws://localhost`. El control remoto solo
   funciona con la app en `http://localhost`. La interfaz debe advertirlo.
2. **El navegador no puede ser servidor MCP.** Siempre hace falta el proceso intermedio.
3. **En stdio, `stdout` es el canal JSON-RPC.** Los registros van a `stderr`.
4. **El bundle público no debe engordar.** `mcp/` no se importa nunca desde `src/`.
5. **El build de Pages debe seguir funcionando** sin cambios en el workflow.

## Deferred

| Elemento | Fase |
|----------|------|
| Endpoint MCP remoto por HTTPS en Vercel | 02 |
| Emparejamiento con token efímero y estado compartido (Upstash) | 02 |
| Herramientas registradas vía WebMCP | 03 |
| Aviso sonoro real (`notification.mp3`) | 04 |
| Reducer puro y pruebas del bucle de cuenta atrás | 04 |
| Control de la pantalla completa desde el agente | No previsto (D-09) |
