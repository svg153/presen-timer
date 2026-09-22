# RESEARCH — Fase 01: puente MCP local

Investigación técnica de implementación. Complementa `.planning/research/MCP-RESEARCH.md`, que cubre el
panorama (transportes, WebMCP, Vercel). Aquí están los datos verificados **contra el repositorio**.

---

## 1. SDK de TypeScript: versiones verificadas

Instalado y comprobado en este repositorio:

| Paquete | Versión instalada | Notas |
|---------|-------------------|-------|
| `@modelcontextprotocol/sdk` | **1.30.0** | `engines.node >= 18`; ESM |
| `ws` | **8.21.3** | Cliente y servidor WebSocket |
| `zod` | **4.6.5** | Subido desde 3.23.8 — ver abajo |

### Hallazgo importante: el SDK 1.30 exige Zod ≥ 3.25 o Zod 4

`@modelcontextprotocol/sdk@1.30.0` declara:

```
"peerDependencies": { "zod": "^3.25 || ^4.0" }
"dependencies":      { "zod": "^3.25 || ^4.0", "zod-to-json-schema": "^3.25.1", ... }
```

El repositorio tenía `zod@3.23.8`, que **no satisface** `^3.25`. Al instalar, npm resolvió el conflicto
creando una **copia anidada de zod 4.6.5** dentro del SDK, dejando dos versiones de Zod en el árbol.

Eso sería un problema real: si el servidor construye los esquemas con la copia de nivel superior y el SDK
los valida con la anidada, los objetos de Zod no coinciden y la validación de argumentos falla.

**Solución aplicada:** subir `zod` a `^4.6.5` en `package.json`, de modo que exista **una sola copia**.
Comprobado con `npm ls zod`: `zod@4.6.5 deduped` para el SDK, `zod-to-json-schema` y la raíz.

**Riesgo del cambio:** ninguno para la aplicación. Se verificó con una búsqueda en `src/` que **no hay
ni una sola importación de `zod`** en el código del navegador; era una dependencia arrastrada por el
scaffold y ahora pasa a estar realmente en uso por el servidor MCP.

### API verificada de `McpServer`

Leída de `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts`:

```ts
class McpServer {
  constructor(serverInfo: Implementation, options?: ServerOptions);

  registerTool<OutputArgs, InputArgs = undefined>(
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: InputArgs;      // ZodRawShape: objeto plano de tipos Zod, NO z.object()
      outputSchema?: OutputArgs;
      annotations?: ToolAnnotations;
    },
    cb: ToolCallback<InputArgs>
  ): RegisteredTool;
}
```

Puntos a tener en cuenta:

- `inputSchema` es un **`ZodRawShape`**: `{ sections: z.array(...) }`, **no** `z.object({...})`.
- El método `tool(...)` está **marcado como obsoleto**: se usa `registerTool`.
- El callback devuelve `CallToolResult`: `{ content: [...], isError?: boolean }`.
- Importaciones ESM: `@modelcontextprotocol/sdk/server/mcp.js` y `.../server/stdio.js`.

---

## 2. Transporte stdio

```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
await server.connect(new StdioServerTransport());
```

### La regla que rompe servidores

En stdio, **`stdout` es el canal JSON-RPC**. Un solo `console.log` inyecta texto que no es JSON en medio
del flujo y el cliente MCP deja de entender el protocolo. El síntoma es confuso: la conexión se cae sin
un mensaje claro.

**Regla para este proyecto:** en `mcp/server.mjs` está **prohibido** usar `console.log`. Todo registro
va por `console.error` (que escribe en `stderr`).

---

## 3. WebSocket en loopback

- El servidor escucha en `127.0.0.1` (no `0.0.0.0`), así que **no es alcanzable desde la red local**.
- Se comprueba la cabecera `Origin` en el apretón de manos para aceptar solo orígenes locales
  (`http://localhost:*`, `http://127.0.0.1:*`).
- Al estar en loopback, la conexión es `ws://` sin cifrar, pero **no sale de la máquina**.

### Por qué `ws` y no el WebSocket nativo de Node

Node 22 incluye un cliente WebSocket global, pero **no un servidor**. Hace falta `ws` para escuchar.
Se usa `ws` en ambos lados del servidor para tener una sola dependencia y la misma semántica.

### Mensajes del protocolo

Todos los mensajes son objetos JSON con un campo `type`. El contrato vive en `shared/mcp-protocol.js`.

| Dirección | `type` | Contenido |
|-----------|--------|-----------|
| Navegador → servidor | `hello` | `protocolVersion`, `client` (nombre/versión) |
| Navegador → servidor | `state` | Instantánea completa del temporizador |
| Navegador → servidor | `result` | Respuesta a un comando: `id`, `ok`, `value`/`error` |
| Servidor → navegador | `welcome` | `protocolVersion`, `server`, `sessionId` |
| Servidor → navegador | `command` | `id`, `name`, `args` |
| Servidor → navegador | `ping` | Latido |

Los comandos se identifican con un `id` y el navegador responde con ese mismo `id`. El servidor mantiene
un mapa `id → promesa pendiente` con un tiempo límite, de modo que una herramienta MCP que se queda sin
respuesta devuelve un error en vez de colgarse.

### Comportamiento con varias pestañas

El servidor aplica el comando a **todas** las pestañas conectadas y devuelve el resultado de la primera
que responda. Se documenta en la descripción de las herramientas para que el agente no se confunda.

---

## 4. El puente en el navegador

`src/mcp/useMcpBridge.ts`:

- Se conecta a `ws://127.0.0.1:8765` al montar.
- **Reintento con retroceso exponencial** (1 s → 2 s → 4 s → … hasta 30 s) con un tope; así, si el
  servidor arranca después de la app, el puente se engancha solo.
- Publica una instantánea de estado **coherente**: el estado se envía cuando cambia, no en cada tick de
  render, para no inundar el canal (60 ticks/s de React frente a 1 cambio/s real).
- Ejecuta los comandos recibidos contra los callbacks del temporizador y responde con `result`.

### Por qué un `useRef` para los callbacks

El efecto de conexión no debe reejecutarse cada vez que cambia una prop. Los callbacks se guardan en un
`useRef` que se actualiza en cada render, y el WebSocket se crea una sola vez. Es el patrón necesario
para no abrir y cerrar la conexión en bucle.

### La instantánea de estado

```ts
interface TimerSnapshot {
  sections: { name: string; duration: number }[]
  currentSectionIndex: number
  timeRemaining: number
  isRunning: boolean
  isWarning: boolean
  totalDuration: number
  elapsed: number
  progress: number
}
```

`totalDuration`, `elapsed` y `progress` se calculan en el navegador con las utilidades existentes para
que el agente reciba una respuesta ya interpretada y no tenga que hacer aritmética.

---

## 5. La restricción de contenido mixto, aplicada

Comprobación concreta para este repositorio:

| Página servida desde | ¿Puede abrir `ws://127.0.0.1:8765`? |
|----------------------|--------------------------------------|
| `http://localhost:8080/presen-timer/` (`npm run dev`) | **Sí** |
| `https://svg153.github.io/presen-timer/` | **No** — bloqueado como contenido mixto activo |

**Consecuencia de diseño:** el puente **no intenta conectarse si `location.protocol === 'https:'`**.
En su lugar muestra un aviso explicando que hay que abrir la app en `http://localhost`. Intentarlo y
fallar en bucle daría la impresión de que algo está roto, cuando en realidad es una regla del navegador.

La web de GitHub Pages **no se toca** (D-04): sigue siendo la demo estática, y el indicador de estado
explica por qué ahí no hay control remoto.

---

## 6. Pruebas

- **Vitest** + entorno `jsdom` para `localStorage`.
- `vitest.config.ts` propio, separado de `vite.config.ts`, para no arrastrar el plugin de React.
- Se prueba:
  - `timerUtils`: `parseTimeString`, `parseSections`, `formatTime`, `calculateTotalDuration`,
    `calculateProgress`, ida y vuelta con `localStorage`.
  - El **mapeo de comandos**: cada comando produce la llamada esperada y los argumentos inválidos
    devuelven error.
- **No se prueba** el tick de `useTimer` (vive en un `useEffect`; es la deuda que aborda la fase 04).

### Verificación end-to-end

La prueba que de verdad importa: un **cliente MCP real** hablando por stdio con `mcp/server.mjs`,
mientras una pestaña de la app corre en `http://localhost`. Con Playwright se comprueba que:

1. `timer_set_sections` cambia las secciones visibles en la interfaz.
2. `timer_start` hace que la cuenta atrás baje.
3. `timer_get_state` devuelve el estado en vivo, coherente con lo que se ve.
4. `timer_next_section` avanza la sección activa.

Se puede usar el cliente del propio SDK (`@modelcontextprotocol/sdk/client`) como cliente de prueba,
que evita depender de tener Claude Code instalado.

---

## 7. Riesgos detectados en la investigación

| Riesgo | Mitigación |
|--------|------------|
| `console.log` en el servidor rompe stdio | Regla explícita; solo `console.error` |
| Dos copias de Zod rompen la validación | `zod` subido a `^4.6.5`; verificado con `npm ls zod` |
| El bundle público engorda con `ws` y el SDK | `mcp/` no se importa nunca desde `src/`; se inspecciona `dist/` |
| Puerto 8765 ocupado | Aviso claro al arrancar; opción `--port` y variable de entorno |
| Reintento infinito contra una página HTTPS | El puente no se conecta si el protocolo es `https:` |
| Comando sin respuesta | Tiempo límite por comando; la herramienta devuelve error |
