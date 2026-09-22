---
phase: 03-webmcp-browser-agent
status: planned
depends_on: [01-local-mcp-bridge]
requirements: [WMCP-01, WMCP-02, WMCP-03]
---

# CONTEXT — Fase 03: WebMCP para el agente del navegador

## Domain

Permitir que el **agente integrado del navegador** (Gemini en Chrome) controle el temporizador sin
instalar nada, sin arrancar ningún proceso y sin configurar ningún cliente. La página declara sus
capacidades y el navegador las pone a disposición de su propio agente.

Es una vía **complementaria**, no sustitutiva: WebMCP no lo pueden invocar Claude Code ni GitHub Copilot.
Quien quiera usar esos agentes seguirá necesitando la fase 01 o la 02.

## Decisions

| ID | Decisión | Motivo |
|----|----------|--------|
| D-06 | WebMCP se aborda **después** de tener MCP funcionando | No puede sustituir a MCP: es otra vía de entrada |
| D-14 | **Detección de capacidad con degradación elegante** | Solo Chrome lo implementa; el resto de navegadores no deben romperse |
| D-15 | Se admiten **los dos nombres de API** (`navigator.modelContext` y `document.modelContext`) | Chrome 150 empezó a migrar de uno a otro |
| D-16 | Las herramientas de WebMCP se derivan del **mismo catálogo** `TIMER_TOOLS` | Una sola definición de las capacidades de la app |

## Canonical refs

| Referencia | Qué contiene |
|------------|--------------|
| `.planning/research/MCP-RESEARCH.md` §6 | Estado de WebMCP, cronología de Chrome, limitación crítica |
| `.planning/phases/01-local-mcp-bridge/01-01-PLAN.md` | El catálogo `TIMER_TOOLS` que se reutiliza aquí |
| `shared/mcp-protocol.js` | Catálogo de herramientas y descripciones |
| `src/mcp/commands.ts` | La capa de comandos que se reutiliza tal cual |
| `src/mcp/useMcpBridge.ts` | Patrón de máquina de estados y publicación de instantáneas |

## Code context

Lo que se reutiliza sin cambios:

- **`shared/mcp-protocol.js`** — el catálogo `TIMER_TOOLS` ya describe nombre, título, descripción y
  argumentos de cada herramienta. Registrar herramientas de WebMCP consiste en recorrer ese mismo
  catálogo, no en escribir una segunda lista.
- **`src/mcp/commands.ts`** — `applyCommand(name, args, timer)` no sabe de dónde viene el comando. Un
  comando de WebMCP es indistinguible de uno que llegó por WebSocket.

Lo que hay que añadir:

- Un hook o módulo que detecte la API, registre las herramientas al montar y las dé de baja al desmontar.
- Un estado visible en la interfaz que indique si el agente del navegador está disponible.
- La traducción del esquema de argumentos a la forma que espere WebMCP (por confirmar cuando la API se
  estabilice).

## Constraints

1. **Solo Chrome lo ha implementado.** Cualquier uso debe ir detrás de una detección de capacidad.
2. **La API está en evolución** (Chrome 150 ya deprecó el nombre antiguo). Debe haber un único punto de
   acceso a la API para que un cambio de nombre no obligue a tocar toda la app.
3. **La web pública es HTTPS**, así que esta fase **sí** funciona desde GitHub Pages: a diferencia de la
   fase 01, no hay ningún WebSocket local implicado. Es la única vía de control remoto compatible con el
   despliegue estático actual.
4. **Sin datos personales.** Las herramientas solo exponen el estado del temporizador, nada más.

## Deferred

| Elemento | Fase |
|----------|------|
| Soporte en otros navegadores | Sin previsión: depende de que Firefox y Safari implementen la especificación |
| Registro de recursos o plantillas de WebMCP | No previsto: solo se usan herramientas |
| Sustituir la interfaz de usuario por el agente | No previsto: la interfaz manual se mantiene |
