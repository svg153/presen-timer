# INTEGRATIONS — presen-timer

## Integraciones existentes

| Integración | Tipo | Estado |
|-------------|------|--------|
| `localStorage` | Persistencia en el navegador | **Activa** — clave `presentation-timer-sections` |
| Audio del navegador (`new Audio`) | Aviso sonoro | **Rota** — el fichero es un placeholder de texto |
| Fullscreen API | Pantalla completa | Activa — requiere gesto de usuario |
| GitHub Pages | Despliegue | Activa — `https://svg153.github.io/presen-timer/` |
| GitHub Actions | CI/CD | Activa — build + despliegue en cada push a `main` |

## Integraciones **ausentes** (relevante para MCP)

- **No hay backend.** Ningún endpoint HTTP propio, ninguna API.
- **No hay WebSocket.** No existe ningún canal de entrada al estado de la app.
- **No hay service worker.** No hay ejecución en segundo plano.
- **No hay variables de entorno de runtime.** Solo `VITE_BASE_PATH` en tiempo de build.
- **No hay autenticación** de ningún tipo.

## Integración que introduce la fase 01

### Servidor MCP local (`mcp/server.mjs`)

```
Cliente MCP (Claude Code / Copilot / Cursor)
   │  stdio · JSON-RPC
   ▼
mcp/server.mjs  ── expone las herramientas timer_*
   │  WebSocket · ws://127.0.0.1:8765  (loopback → loopback)
   ▼
Pestaña en http://localhost:8080/presen-timer/
```

**Contrato:**

| Aspecto | Valor |
|---------|-------|
| Transporte cliente ↔ servidor | `stdio` (`@modelcontextprotocol/sdk`) |
| Transporte servidor ↔ navegador | WebSocket (`ws`) |
| Dirección de escucha | `127.0.0.1` (solo loopback) |
| Puerto | 8765 por defecto; `--port` o `PRESEN_TIMER_MCP_PORT` |
| Dirección de los comandos | Cliente → servidor → navegador |
| Dirección del estado | Navegador → servidor (instantáneas) |
| Autenticación | Ninguna (justificado por el enlace a loopback) |
| Salida de registros | `stderr` (stdout reservado a JSON-RPC) |

### Restricciones de la integración

1. **Contenido mixto.** Una página servida por HTTPS **no puede** abrir `ws://127.0.0.1:8765`.
   Consecuencia: el control remoto solo funciona sirviendo la app desde `http://localhost`.
   El sitio de GitHub Pages seguirá funcionando como demo estática, pero sin control remoto.
2. **Ciclo de vida.** El servidor vive lo que vive el proceso del cliente MCP; el puente, lo que vive
   la pestaña. Si se cierra cualquiera de los dos, no queda nada escuchando.
3. **Un solo destino por pestaña.** El comando se aplica a la pestaña conectada; si hay varias, el
   servidor aplica a todas las que estén conectadas.

## Integraciones futuras

| Fase | Integración |
|------|-------------|
| 02 | Endpoint MCP por HTTP en Vercel (`mcp-handler@2`), estado compartido en Upstash Redis, control de acceso por Bearer/OAuth |
| 03 | WebMCP (`document.modelContext`) para el agente integrado del navegador |
