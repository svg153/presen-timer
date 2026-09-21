# REQUIREMENTS — presen-timer

Version: v1
Última revisión: fase 01 (puente MCP local)

Cada requisito tiene un identificador estable `CATEGORÍA-NN`. Las categorías agrupan por área funcional,
no por fase: una fase puede cubrir requisitos de varias categorías.

---

## v1 — Alcance de la fase 01

### MCP — Herramientas del servidor MCP

| ID | Requisito | Estado |
|----|-----------|--------|
| MCP-01 | `timer_get_state` devuelve el estado vivo: secciones, índice actual, tiempo restante, `isRunning`, `isWarning` y si hay una pestaña conectada | Activo |
| MCP-02 | `timer_set_sections` reemplaza la estructura completa de secciones | Activo |
| MCP-03 | `timer_add_section` añade una sección al final | Activo |
| MCP-04 | `timer_update_section` modifica el nombre y/o la duración de una sección existente | Activo |
| MCP-05 | `timer_remove_section` elimina una sección por índice | Activo |
| MCP-06 | `timer_start`, `timer_pause` y `timer_toggle` controlan la marcha de la cuenta atrás | Activo |
| MCP-07 | `timer_reset_section` reinicia la sección actual a su duración original | Activo |
| MCP-08 | `timer_next_section` y `timer_prev_section` navegan entre secciones | Activo |
| MCP-09 | `timer_jump_to_section` salta a una sección por índice o por nombre | Activo |
| MCP-10 | `timer_add_time` añade tiempo extra a la sección actual | Activo |
| MCP-11 | `timer_end_presentation` finaliza la presentación | Activo |
| MCP-12 | Las duraciones aceptan `"5m"`, `"1h"` o un número de segundos, con las mismas reglas que `parseTimeString` | Activo |
| MCP-13 | Cuando no hay ninguna pestaña conectada, las herramientas devuelven un error accionable que explica cómo abrir la app en `http://localhost` | Activo |

### BRG — Puente navegador ↔ servidor

| ID | Requisito | Estado |
|----|-----------|--------|
| BRG-01 | El puente escucha únicamente en `127.0.0.1` y vive solo mientras el proceso y la pestaña están abiertos | Activo |
| BRG-02 | El navegador se reconecta solo, con retroceso exponencial, si el puente se cae | Activo |
| BRG-03 | El navegador envía instantáneas de estado al puente para que `timer_get_state` responda con datos vivos | Activo |
| BRG-04 | El formato de los mensajes está definido una sola vez y lo comparten navegador y servidor | Activo |
| BRG-05 | Todos los registros del servidor van a `stderr`; `stdout` queda reservado al canal JSON-RPC | Activo |
| BRG-06 | El puerto es configurable por `--port` y por la variable `PRESEN_TIMER_MCP_PORT` (por defecto 8765) | Activo |

### SEC — Seguridad

| ID | Requisito | Estado |
|----|-----------|--------|
| SEC-01 | El servidor MCP **no** escucha fuera de loopback por defecto | Activo |
| SEC-02 | El puente rechaza conexiones cuyo `Origin` no sea `localhost` o `127.0.0.1` | Activo |
| SEC-03 | No se introduce ningún secreto, token ni credencial en el repositorio | Activo |

### UI — Interfaz

| ID | Requisito | Estado |
|----|-----------|--------|
| UI-01 | La interfaz muestra si el puente está conectado, conectando o desconectado | Activo |
| UI-02 | La interfaz ofrece el fragmento de configuración listo para pegar en el cliente MCP | Activo |
| UI-03 | Si la página se sirve por HTTPS, la interfaz explica que el control remoto requiere `http://localhost` en lugar de fallar en silencio | Activo |

### DOC — Documentación

| ID | Requisito | Estado |
|----|-----------|--------|
| DOC-01 | El repositorio contiene el árbol `.planning/` conforme a GSD (proyecto, requisitos, roadmap, estado, codebase) | Activo |
| DOC-02 | Existe una investigación escrita sobre MCP, WebMCP y las opciones de despliegue | Activo |
| DOC-03 | El README explica cómo arrancar el servidor MCP y configurar el cliente | Activo |
| DOC-04 | El catálogo de features está documentado (table stakes, diferenciales, anti-features) | Activo |

### TST — Pruebas y verificación

| ID | Requisito | Estado |
|----|-----------|--------|
| TST-01 | Vitest está configurado y se ejecuta con `npm run test` | Cumplido |
| TST-02 | `timerUtils` tiene pruebas unitarias | Cumplido |
| TST-03 | El mapeo comando MCP → acción del temporizador tiene pruebas unitarias | Cumplido |
| TST-04 | Existe una verificación end-to-end con un cliente MCP real controlando una pestaña | Cumplido |
| TST-05 | `npm run build` sigue produciendo un bundle válido para `/presen-timer/` y sin dependencias de servidor | Cumplido |

---

## v2 — Fases posteriores (documentadas, no implementadas)

### RMCP — MCP remoto alojado (fase 02)

| ID | Requisito | Estado |
|----|-----------|--------|
| RMCP-01 | Un endpoint MCP accesible por HTTP en un dominio público | Planeado |
| RMCP-02 | Reutiliza la misma superficie de herramientas `timer_*` que la v1 | Planeado |
| RMCP-03 | Emparejamiento entre el agente y una pestaña concreta mediante un identificador de sesión | Planeado |
| RMCP-04 | Control de acceso al endpoint (Bearer u OAuth) | Planeado |
| RMCP-05 | La app puede desplegarse en la raíz del dominio (`VITE_BASE_PATH=/`) | Planeado |
| RMCP-06 | El estado compartido entre peticiones vive en un almacén externo | Planeado |

### WMCP — WebMCP (fase 03)

| ID | Requisito | Estado |
|----|-----------|--------|
| WMCP-01 | La página registra sus herramientas para el agente del navegador | Planeado |
| WMCP-02 | Detección de características con degradación limpia si no está disponible | Planeado |
| WMCP-03 | Soporte tanto de `document.modelContext` como del nombre anterior `navigator.modelContext` | Planeado |

---

## Out of Scope

| Elemento | Motivo |
|----------|--------|
| Backend permanente para la app | La app debe seguir funcionando sin red y como sitio estático |
| `timer_toggle_fullscreen` | La API de pantalla completa exige un gesto de usuario |
| Autenticación en la v1 | El puente escucha solo en loopback |
| Control remoto desde la web de GitHub Pages | Contenido mixto: HTTPS no puede hablar con `ws://localhost` |
| Servidor MCP siempre activo | Contradice el requisito de ser efímero |
| Sustituir `public/notification.mp3` | Requiere que el usuario aporte el audio real |
| Actualizar las 55 dependencias vulnerables | Se ofrece como PR independiente |

---

## Traceability

| Requisito | Fase | Plan | Verificación |
|-----------|------|------|--------------|
| CORE-01 … CORE-08 | — (validado) | — | Suite manual existente + build |
| MCP-01 … MCP-13 | 01 | `01-01-PLAN.md` | TST-03, TST-04 |
| BRG-01 … BRG-06 | 01 | `01-01-PLAN.md` | TST-04 |
| SEC-01 … SEC-03 | 01 | `01-01-PLAN.md` | Revisión manual + `npm run lint` |
| UI-01 … UI-03 | 01 | `01-01-PLAN.md` | TST-04 |
| DOC-01 … DOC-04 | 01 | `01-01-PLAN.md` | Revisión manual |
| TST-01 … TST-05 | 01 | `01-01-PLAN.md` | Ejecución de la propia suite |
| RMCP-01 … RMCP-06 | 02 | — (pendiente) | — |
| WMCP-01 … WMCP-03 | 03 | — (pendiente) | — |

### Comprobación de cobertura

- Requisitos v1 definidos: **31**
- Requisitos v1 con fase asignada: **31** (100 %)
- Requisitos v1 con plan asignado: **31** (100 %)
- Requisitos v1 con verificación asignada: **31** (100 %)
- Requisitos v2 definidos: **9**, todos con fase asignada y sin plan (correcto: son fases futuras)
