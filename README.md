# presen-timer ⏱️

Temporizador para presentaciones con secciones cronometradas: define las secciones de tu charla (`Introducción: 5m`, `Demo: 10m`...), y el timer avanza automáticamente con avisos sonoros y visuales para que no pierdas el hilo ni el tiempo.

## ✨ Funcionalidades

- **Secciones cronometradas**: define una por línea con formato `Nombre: 5m` (minutos) o `2h` (horas)
- **Edición en bloque**: reescribe todo el guion de una vez como texto plano `Nombre: 5m`, con vista previa en vivo del total
- **Edición por sección**: renombrar, cambiar la duración, reordenar y eliminar desde la barra lateral
- **Avance automático** entre secciones con notificación sonora
- **Aviso visual** a 30 segundos del final de cada sección
- **Tiempo extra (overtime)**: si te pasas, la cuenta sigue en negativo y el avance automático se puede desactivar
- **Atajos de teclado** para controlar el timer sin tocar el ratón
- **Presets**: guarda varios guiones con nombre, e impórtalos/expórtalos como JSON
- **Estadísticas** de la presentación al terminar
- **Modo presentador** a pantalla completa con fondo tipo semáforo
- **PWA instalable** con Screen Wake Lock (la pantalla no se apaga)
- **Tema claro/oscuro** e interfaz en **español e inglés**
- **Barra de progreso** global de la presentación
- **Persistencia**: tus secciones se guardan en el navegador
- **Control remoto por MCP**: un agente puede leer el estado y redefinir el guion en vivo (opcional, en local)

## 🚀 Uso

```bash
npm install
npm run dev
```

Abre `http://localhost:8080`, escribe tus secciones y pulsa **Create Timer**.

Todo se ejecuta en el cliente: las secciones se guardan en `localStorage` y no se envía nada a ningún servidor. El puente MCP opcional es un proceso local en `127.0.0.1` — ver [Control remoto por MCP](#control-remoto-por-mcp).

### Scripts

```bash
npm run build     # bundle de producción en dist/
npm run preview   # sirve el bundle compilado
npm run typecheck # tsc --noEmit (app + config de Vite)
npm run lint      # eslint
npm run test      # vitest (unitarios + integración del servidor MCP)
```

`npm run test:e2e` maneja la app con un cliente MCP real y necesita una pestaña del navegador abierta — ver [Verificar el puente](#verificar-el-puente).

> **Node ≥ 22 es obligatorio.** `vite@8` pide `^20.19.0 || >=22.12.0` y `vitest@5` pide `^22.12.0 || ^24.0.0 || >=26.0.0`.
> Ojo: `npm run build` es `vite build` a secas y **no** comprueba tipos — para eso está `npm run typecheck`,
> que la CI ejecuta en cada pull request junto con `lint` y `test`.

## 🛠️ Stack

Vite 8 · React 18 · TypeScript 5 · react-router-dom 7 · shadcn/ui · Tailwind CSS 3

## Control remoto por MCP

El timer expone un servidor [Model Context Protocol](https://modelcontextprotocol.io) para que un agente (Claude Code, GitHub Copilot, Cursor, …) pueda leer el estado del timer y redefinir el guion mientras la presentación está en pantalla.

El puente es **local y efímero por diseño**: el servidor MCP es un proceso Node normal que tu cliente MCP lanza por stdio, escucha solo en `127.0.0.1` y muere con el cliente. Sin cuenta, sin token, sin servicio alojado y sin que ningún dato salga de tu máquina.

```
┌────────────────────┐   stdio (JSON-RPC)   ┌──────────────────────────┐
│ Claude Code /      │◄────────────────────►│  mcp/server.mjs          │
│ Copilot / Cursor   │                      │  · herramientas MCP      │
└────────────────────┘                      │  · puente WebSocket      │
                                            └───────────┬──────────────┘
                                                        │ ws://127.0.0.1:8765
                                            ┌───────────▼──────────────┐
                                            │ App en http://localhost  │
                                            │ src/mcp/useMcpBridge.ts  │
                                            │ → useTimer               │
                                            └──────────────────────────┘
```

### Configuración

1. Arranca la app: `npm run dev` (abre http://localhost:8080/presen-timer/).
2. Arranca el servidor MCP: `npm run mcp`.
3. Registra el servidor en tu cliente MCP:

```json
{
  "mcpServers": {
    "presen-timer": {
      "command": "node",
      "args": ["/ruta/absoluta/a/presen-timer/mcp/server.mjs", "--port", "8765"]
    }
  }
}
```

El paso 2 es opcional si el propio cliente lanza el servidor con la configuración de arriba. Una píldora de estado en la esquina inferior izquierda de la app indica si hay un cliente conectado y ofrece esa misma configuración con un clic. Usa `--port`/`-p`, `--port=NNNN` o `PRESEN_TIMER_MCP_PORT` para cambiar el puerto.

### Herramientas

| Herramienta | Para qué sirve |
| --- | --- |
| `timer_get_state` | Estado completo: secciones, sección actual, tiempo restante, progreso |
| `timer_set_sections` | Reemplaza todo el guion |
| `timer_add_section` | Añade una sección al final |
| `timer_update_section` | Renombra o cambia la duración de una sección |
| `timer_remove_section` | Elimina una sección |
| `timer_start` / `timer_pause` / `timer_toggle` | Controlan la cuenta atrás |
| `timer_reset_section` | Reinicia la sección actual |
| `timer_next_section` / `timer_prev_section` | Navegan entre secciones |
| `timer_jump_to_section` | Salta por índice o por nombre |
| `timer_add_time` | Añade tiempo extra a la sección actual |
| `timer_end_presentation` | Termina la presentación |

Las duraciones aceptan `"5m"`, `"1h"` o un número de segundos. Los cambios estructurales vuelven a la primera sección y detienen la cuenta atrás, así que cada herramienta que lo hace lo dice en su descripción. Pantalla completa no se expone a propósito: requiere un gesto del usuario en el navegador.

### Por qué esto no puede correr en GitHub Pages

El sitio publicado se sirve por **HTTPS**, y el navegador bloquea que una página HTTPS abra una conexión `ws://` sin cifrar por contenido mixto: no hay excepción por CSP ni por flag que valga en producción. Por eso el puente funciona cuando la app se sirve desde `http://localhost`, y en el despliegue de Pages la píldora de estado indica que no está disponible. El control remoto desde una URL pública está planificado como fase posterior (ver [`.planning/ROADMAP.md`](.planning/ROADMAP.md)).

### Verificar el puente

`npm run test` cubre el protocolo, la capa de comandos y el servidor MCP por stdio. El round-trip completo necesita una pestaña real del navegador, así que vive en un script aparte:

```sh
npm run dev                       # terminal 1
npm run test:e2e                  # terminal 2
npm run test:e2e -- --port 8801   # contra ?mcpPort=8801
```

Lanza el servidor como un cliente MCP real, espera a que la pestaña se conecte, rehace el guion y comprueba 23 comportamientos: reemplazo de estructura, normalización de duraciones, navegación, errores de validación y que `timer_add_time` alarga la cuenta atrás sin tocar las duraciones configuradas. Sale con código distinto de cero si algo falla y se salta la CI a propósito, porque necesita un navegador.

## 🤖 Desarrollo con agentes IA

Este repositorio está preparado para desarrollo asistido por agentes:

- **[`AGENTS.md`](AGENTS.md)** — guía para agentes: stack, arquitectura, convenciones y reglas
- **[`docs/ROADMAP.md`](docs/ROADMAP.md)** — roadmap de features priorizado con specs accionables
- **[`.planning/`](.planning/)** — planificación de la fase MCP en formato [GSD](https://github.com/open-gsd/gsd-core): requisitos, roadmap, investigación verificada y planes de fase
- **Skills** (`.github/skills/`) — flujos reutilizables: `timer-feature`, `release`
- **Agente personalizado** (`.github/agents/`) — `presen-timer-dev` para Copilot
- **Decisiones IA** — issue #4, marcador `[AI-DECISION]`

## 🚢 Despliegue

El sitio se publica en GitHub Pages desde `.github/workflows/deploy-pages.yml` en cada push a `main`. La app es consciente del *base path*: `vite.config.ts` lee `VITE_BASE_PATH` (por defecto `/presen-timer/`) y el workflow lo ajusta al nombre del repositorio, de modo que el router, el audio, el favicon y la imagen `og:` funcionan bajo un subdirectorio. El workflow copia `dist/index.html` a `dist/404.html` para que las rutas del SPA no den 404.

## 📄 Licencia

MIT

## 🎵 Créditos

El aviso sonoro de fin de sección (`public/notification.wav`) procede de
[`akx/Notifications`](https://github.com/akx/Notifications) (`WAV/Alarmed.wav`), publicado bajo
**CC0 1.0 Universal (dominio público)**. No requiere atribución; este crédito es cortesía.
