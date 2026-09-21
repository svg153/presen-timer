---
phase: 02-remote-mcp-vercel
status: planned
depends_on: [01-local-mcp-bridge]
requirements: [RMCP-01, RMCP-02, RMCP-03, RMCP-04, RMCP-05, RMCP-06]
---

# CONTEXT — Fase 02: servidor MCP remoto en Vercel

## Domain

Convertir el control remoto en algo que funcione **desde cualquier sitio**, no solo desde
`http://localhost`. Es la fase que elimina la limitación de contenido mixto de la fase 01, a cambio de
introducir infraestructura: un servicio alojado, estado compartido y control de acceso.

El problema de fondo es que un servidor MCP remoto es **sin estado por petición**, pero controlar la
pestaña de un usuario concreto exige tres cosas que no vienen dadas: un canal lateral hacia esa pestaña,
un almacén que relacione sesión y pestaña, y una forma de que solo el dueño del temporizador pueda
moverlo.

## Decisions

| ID | Decisión | Motivo |
|----|----------|--------|
| D-05 | El MCP remoto va en **Vercel**, no en GitHub Pages | Pages solo sirve ficheros estáticos; no ejecuta código de servidor |
| D-10 | Transporte **Streamable HTTP** mediante `mcp-handler` | Es el transporte remoto de la especificación; la v2 ya retiró HTTP+SSE |
| D-11 | **Emparejamiento con código efímero**, no token estático | Un token fijo en el repositorio público no protege nada |
| D-12 | Estado compartido en **Upstash Redis** | Capa gratuita permanente, acceso REST, sin tarjeta |
| D-13 | La app en Vercel se sirve con `VITE_BASE_PATH=/` | La raíz del dominio es el proyecto, no un subdirectorio |
| D-04 | GitHub Pages **sigue existiendo** como demo estática | No se retira nada de lo que ya funciona |

## Canonical refs

| Referencia | Qué contiene |
|------------|--------------|
| `.planning/research/MCP-RESEARCH.md` §7 | `mcp-handler`, requisitos de Zod 4, Upstash, notas de Vercel |
| `.planning/phases/01-local-mcp-bridge/CONTEXT.md` | Decisiones de la fase anterior |
| `.planning/phases/01-local-mcp-bridge/01-01-PLAN.md` | Qué se construyó y qué se deja preparado |
| `.planning/REQUIREMENTS.md` | RMCP-01…RMCP-06 |
| `shared/mcp-protocol.js` | El contrato que la fase 01 comparte entre los dos lados (D-08) |

## Code context

Lo que la fase 01 deja preparado para esta fase:

- **`shared/mcp-protocol.js` es independiente del transporte.** La capa de comandos (`src/mcp/commands.ts`)
  no sabe si el comando llegó por WebSocket o por HTTP: solo recibe `{ name, args }` y devuelve un
  resultado. Por eso esta fase puede añadir un segundo transporte sin tocar la lógica.
- `mcp/server.mjs` ya contiene el catálogo de herramientas derivado de `TIMER_TOOLS`, reutilizable por el
  manejador HTTP.
- `src/mcp/useMcpBridge.ts` ya tiene máquina de estados, reconexión y publicación de instantáneas.

Lo que **hay que cambiar**:

- El puente del navegador debe poder abrir **una conexión saliente** al servidor remoto (WebSocket
  seguro, `wss:`) y registrarse con un código de emparejamiento.
- La app necesita soportar `VITE_BASE_PATH=/` para el despliegue en la raíz del dominio de Vercel.
- El enrutado de la SPA necesita `rewrites` en `vercel.json` en lugar del truco de `404.html`.

## Constraints

1. **`mcp-handler` v2 exige Node 20+, `@modelcontextprotocol/server@2` y `zod@4.2.0+`.** El proyecto ya
   está en Zod 4.6.5 gracias a la fase 01, así que este obstáculo ya está salvado.
2. **Un endpoint público necesita control de acceso.** Sin él, cualquiera puede mover el temporizador de
   cualquiera. No es opcional.
3. **El canal lateral debe ser saliente desde el navegador.** Un servidor serverless no puede abrir una
   conexión hacia una pestaña; la pestaña tiene que llamar a casa.
4. **Los secretos viven en el entorno de Vercel**, nunca en el repositorio público.
5. **La app sigue siendo utilizable sin la parte remota.** El modo local de la fase 01 no se degrada.

## Deferred

| Elemento | Fase |
|----------|------|
| Herramientas vía WebMCP | 03 |
| Autenticación OAuth completa con inicio de sesión | No prevista: el emparejamiento efímero es suficiente |
| Historial de presentaciones en la nube | No previsto |
| Modo colaborativo con varios presentadores | No previsto |
