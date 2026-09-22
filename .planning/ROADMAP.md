# ROADMAP — presen-timer

Granularidad: estándar (5–8 fases máximas, sin estimaciones de tiempo).

## Fases

| # | Fase | Objetivo | Estado |
|---|------|----------|--------|
| 01 | `01-local-mcp-bridge` | Un agente controla el temporizador y reescribe la estructura de secciones desde `http://localhost` | **Completada** |
| 02 | `02-remote-mcp-vercel` | El mismo control desde cualquier red o dispositivo, con control de acceso | Planeada |
| 03 | `03-webmcp-browser-agent` | La página expone sus herramientas al agente integrado del navegador | Planeada |
| 04 | `04-hardening` | Reducer puro, canal push en lugar de instantáneas, deudas técnicas | Diferida |

---

## Phase Details

### Phase 01 — Puente MCP local

**Goal:** Que un agente MCP (Claude Code, GitHub Copilot, Cursor) pueda leer el estado del temporizador,
controlarlo y **redefinir por completo la estructura de secciones** de una pestaña abierta en
`http://localhost`, sin ningún servicio en la nube, sin tokens y sin coste.

**Depends on:** —

**Requirements:** MCP-01 … MCP-13, BRG-01 … BRG-06, SEC-01 … SEC-03, UI-01 … UI-03, DOC-01 … DOC-04, TST-01 … TST-05

**Success Criteria:**

- Un cliente MCP real descubre y ejecuta las 14 herramientas `timer_*`.
- `timer_set_sections` cambia lo que se ve en la pestaña en menos de un segundo.
- `timer_start` hace que el tiempo restante decrezca de verdad, y `timer_get_state` lo refleja.
- Parar el servidor y volver a arrancarlo no requiere recargar la pestaña.
- `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` pasan; el bundle no incluye `ws` ni el SDK de MCP.
- El despliegue de GitHub Pages sigue funcionando sin cambios.

**Plans:** `01-01-PLAN.md` — **Estado: completada** (T1 … T8; 67 pruebas unitarias y 23/23 de aceptación en verde).

---

### Phase 02 — MCP remoto alojado

**Goal:** Que el mismo conjunto de herramientas esté disponible en una URL pública, para poder controlar
la presentación desde otro dispositivo o red, con emparejamiento explícito y control de acceso.

**Depends on:** Phase 01 (reutiliza la capa de comandos y el protocolo)

**Requirements:** RMCP-01 … RMCP-06

**Success Criteria (a validar cuando se planifique):**

- Un cliente MCP remoto se conecta a `https://<proyecto>.vercel.app/api/mcp`.
- Solo la pestaña emparejada recibe los comandos.
- El endpoint rechaza peticiones sin credencial válida.
- La app sigue desplegada además en GitHub Pages.

**Plans:** pendiente

**Referencia:** `.planning/phases/02-remote-mcp-vercel/RESEARCH.md`

---

### Phase 03 — WebMCP

**Goal:** Que la propia página anuncie sus herramientas al agente integrado del navegador, sin servidor
alguno, para el caso de uso "el navegador me ayuda a preparar la charla".

**Depends on:** Phase 01 (la superficie de herramientas ya está definida)

**Requirements:** WMCP-01 … WMCP-03

**Success Criteria (a validar cuando se planifique):**

- En un Chrome con el origin trial activo, las herramientas aparecen disponibles para el agente del navegador.
- En navegadores sin soporte, la app funciona exactamente igual que hoy.
- Se soportan `document.modelContext` y `navigator.modelContext`.

**Plans:** pendiente

**Referencia:** `.planning/phases/03-webmcp-browser-agent/RESEARCH.md`

---

### Phase 04 — Endurecimiento

**Goal:** Pagar la deuda técnica que la fase 01 deja conscientemente aparcada.

**Depends on:** Phase 01

**Requirements:** por definir

**Candidatos:**

- Extraer el estado del temporizador a un reducer puro y cubrirlo con pruebas.
- Sustituir las instantáneas de estado por un canal push (SSE o evento dirigido) para reducir tráfico.
- ~~Sustituir `public/notification.mp3` por audio real~~ — hecho: `public/notification.wav` (CC0).
- ~~Actualizar las dependencias con avisos de Dependabot~~ — hecho: `npm audit` de 23 a **0**.
- ~~Resolver los errores de ESLint preexistentes del scaffold de shadcn~~ — ya resuelto en `main` por la PR #5.

**Plans:** pendiente

---

## Progress

| Fase | Requisitos cubiertos | Planes | Verificado |
|------|----------------------|--------|------------|
| 01 | 31 / 31 (v1) | 1 | — |
| 02 | 6 (v2) | 0 | — |
| 03 | 3 (v2) | 0 | — |
| 04 | 0 | 0 | — |
