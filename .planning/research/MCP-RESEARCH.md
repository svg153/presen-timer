# MCP-RESEARCH — Investigación previa a la fase 01

Fecha de la investigación: sesión de trabajo actual.
Fuentes: documentación oficial del Model Context Protocol, repositorio del SDK de TypeScript,
documentación de Vercel, especificación de WebMCP y documentación de Chrome.

---

## 1. Qué es MCP y por qué encaja aquí

El **Model Context Protocol** es un protocolo abierto (JSON-RPC 2.0) que permite a un agente
—Claude Code, GitHub Copilot, Cursor…— invocar capacidades expuestas por un **servidor**. Un servidor
MCP puede ofrecer tres cosas:

| Primitiva | Para qué sirve | Uso en presen-timer |
|-----------|----------------|---------------------|
| **Tools** | Acciones que el modelo decide invocar | Controlar el temporizador |
| **Resources** | Datos que el cliente puede leer | (No se usa en v1) |
| **Prompts** | Plantillas de conversación | (No se usa en v1) |

La app encaja como **servidor de herramientas**: el agente decide "pon el temporizador en marcha" o
"define estas cuatro secciones", y el servidor traduce esa decisión en una acción sobre la pestaña.

### Punto clave

El valor no está en exponer un botón más, sino en que **el agente construye la estructura**. El usuario
puede pedir en lenguaje natural "arma una charla de 20 minutos: intro 3, explicación 5, demo 10 y
preguntas 2", y el agente llama a `timer_set_sections`. Eso es exactamente lo que hoy obliga a escribir
cuatro líneas de texto a mano en `SectionInput`.

---

## 2. Transportes: cuál usar y cuándo

La especificación define tres transportes:

| Transporte | Cuándo se usa | Autenticación |
|-----------|----------------|---------------|
| **stdio** | El cliente lanza el servidor como proceso hijo; hablan por tuberías | No hace falta (proceso local) |
| **Streamable HTTP** | El servidor está alojado y el cliente se conecta por URL | OAuth / Bearer obligatorio |
| **HTTP + SSE** (obsoleto) | Reemplazado por Streamable HTTP | — |

### Reglas que condicionan el diseño

1. **En stdio, `stdout` es el canal JSON-RPC.** Cualquier `console.log` lo corrompe. Los registros van
   **siempre a `stderr`**. Es el error más común al escribir un servidor MCP y rompe la conexión de
   forma difícil de diagnosticar.
2. **En stdio no hace falta autenticación**: el proceso lo lanza el propio cliente en la máquina del
   usuario. No hay superficie de red.
3. **En Streamable HTTP la autenticación sí es obligatoria** en cuanto el endpoint está en Internet.
   Sin ella, cualquiera puede mover tu temporizador.

---

## 3. SDK de TypeScript

- Paquete: `@modelcontextprotocol/sdk`.
- **Solo ESM.** El proyecto ya tiene `"type": "module"`, así que encaja sin cambios.
- Node ≥ 18.
- Validación de argumentos con **Zod**.
- **La versión 1 del SDK usa Zod 3** — coincide con el `zod@^3.23.8` que ya tiene el repositorio.
  Por eso la fase 01 **no toca Zod**.
- Registro de herramientas:

```ts
server.registerTool(
  'timer_set_sections',
  {
    title: 'Definir secciones',
    description: '...',
    inputSchema: { sections: z.array(z.object({ name: z.string(), duration: z.string() })) },
  },
  async ({ sections }) => ({ content: [{ type: 'text', text: '...' }] })
);
```

---

## 4. El problema real: el navegador no puede ser un servidor MCP

Esta es la conclusión más importante de toda la investigación.

MCP es un protocolo entre un **cliente** (un agente) y un **servidor** (un proceso o un endpoint HTTP).
**Una pestaña del navegador no puede actuar como servidor MCP.** No hay forma de que Claude Code
"se conecte" a una pestaña. Se necesita un proceso intermedio.

### Opciones de arquitectura

```
A) Puente local efímero
   Agente ──stdio──► servidor MCP (proceso local, lanzado por el agente)
                        │
                        └──WebSocket──► pestaña en http://localhost
   · Sin nube, sin cuentas, sin coste, sin tokens
   · Vive solo mientras el proceso y la pestaña estén abiertos
   · NO funciona desde la web HTTPS de GitHub Pages

B) Servidor MCP remoto alojado (Vercel)
   Agente ──HTTPS──► endpoint /api/mcp en Vercel ──???──► pestaña del usuario
   · El servidor es sin estado por petición; hace falta un canal lateral
     (WebSocket o SSE) y estado compartido (p. ej. Upstash Redis)
   · Hace falta token de emparejamiento y control de acceso
   · Funciona desde cualquier sitio, incluida la web pública

C) WebMCP
   El agente integrado del navegador invoca herramientas que la página registra
   · NO lo pueden invocar Claude Code ni Copilot
   · Solo Chrome lo implementa hoy
```

### Decisión

**A ahora; B y C documentadas como fases futuras.** El usuario eligió explícitamente esta opción:
funcionalidad real, cero infraestructura, cero coste, cero secretos.

---

## 5. La restricción que decide todo: contenido mixto

Una página servida por **HTTPS no puede abrir un WebSocket en `ws://localhost`**. El navegador lo
bloquea como **contenido mixto activo**, y no existe bandera ni directiva CSP utilizable en producción
para saltárselo.

Alternativas y por qué se descartan:

| Alternativa | Problema |
|-------------|----------|
| `wss://localhost` con certificado de confianza | Obliga al usuario a instalar un certificado |
| Proxy inverso TLS local (Nginx/Caddy) | Instalación y configuración pesadas |
| Private Network Access (PNA) | Aplica a `fetch`/XHR, no a WebSocket; comportamiento por navegador y en evolución |

**Consecuencia asumida:** el puente funciona con la app servida en **`http://localhost`** (desarrollo o
ejecución local). Desde `https://svg153.github.io/presen-timer/` **no funcionará**, y la interfaz debe
decirlo con claridad en vez de intentarlo y fallar.

---

## 6. WebMCP (fase 03)

- Permite a una página registrar **herramientas estructuradas** que un agente puede invocar, en lugar de
  que el agente raspe el DOM.
- API: `navigator.modelContext`, **migrando a `document.modelContext`**.
- Cronología: Chrome 146 Canary tras bandera → **Chrome 149** con *origin trial* público → Chrome 150
  empieza a deprecar el nombre antiguo.
- **W3C Community Group** con Google, Microsoft, Mozilla y Apple participando.
- **Solo Chrome lo ha implementado.**

### Limitación crítica

Las herramientas de WebMCP **solo las puede invocar el agente propio del navegador** (Gemini en Chrome).
**Claude Code y GitHub Copilot CLI no pueden.** Es decir: WebMCP no sustituye a MCP, lo complementa.

Por eso la fase 03 debe **detectar la capacidad** (`navigator.modelContext ?? document.modelContext`) y
degradar con elegancia si no existe.

---

## 7. Servidor MCP remoto en Vercel (fase 02)

- **`mcp-handler` v2**: adaptador HTTP que convierte una definición de servidor MCP en un manejador
  estándar `(Request) => Promise<Response>`. **No está atado a Next.js**: funciona en Nuxt/Nitro,
  SvelteKit, Hono y frameworks sobre Vite.
- **Requiere Node 20+, `@modelcontextprotocol/server@2` y `zod@4.2.0+`** como dependencia estricta.
  El repositorio tiene `zod@3.23.8`, así que la fase 02 tendrá que subir Zod o usar un alias.
- La v2 **eliminó** el transporte HTTP+SSE heredado y la configuración de Redis integrada.
- En proyectos que no son Next.js, un directorio `/api` en la raíz se detecta como funciones
  serverless. `vite-plugin-vercel` formaliza la integración.
- Despliegue: `npx vercel deploy --prod`. Prueba local: `npx vercel dev`.

### El problema sin resolver de la fase 02

Un servidor MCP remoto es **sin estado por petición**. Pero controlar la pestaña de un usuario concreto
requiere:

1. **Un canal lateral** hacia esa pestaña (WebSocket o SSE).
2. **Estado compartido** que relacione sesión, token y pestaña.
3. **Control de acceso**, porque el endpoint es público.

Candidato para el estado: **Upstash Redis** desde el Marketplace de Vercel — capa gratuita permanente,
10 bases de datos, 256 MB por base, 500 000 comandos al mes, sin tarjeta de crédito y con acceso por
REST/HTTP, ideal para serverless.

### Nota sobre el despliegue

GitHub Pages necesita el truco de `dist/404.html` para el enrutado de la SPA. Vercel en cambio usa
`rewrites` hacia `index.html` en `vercel.json`, y requiere `VITE_BASE_PATH=/`.

---

## 8. GSD

- **GSD Core** ("Git. Ship. Done."): meta-prompting y desarrollo guiado por especificación.
- Repositorio antiguo `gsd-build/get-shit-done` **archivado**; hogar actual `open-gsd/gsd-core`.
- Paquete npm `@opengsd/gsd-core`, versión **1.14.0**, licencia **MIT**.
- Instalador: `npx @opengsd/gsd-core@latest --copilot --local` (Copilot es un runtime de primera clase).
- Instala 72 *skills* en `.claude/`, un marcador en `.github/copilot-instructions.md` y ganchos en
  `.github/hooks/gsd-session.json`.

### Decisión sobre GSD

Los artefactos de `.planning/` se **escriben a mano** siguiendo las plantillas oficiales de GSD, en vez
de ejecutar el instalador. Motivo: el instalador añadiría `.claude/` (72 *skills*), un fichero de
instrucciones y un directorio de ganchos a un **repositorio público**, generando un diff de miles de
ficheros imposible de revisar. El instalador queda documentado como paso opcional en
`.planning/onboarding/SUMMARY.md`.

El ciclo de GSD que se sigue es: **Discutir → Planificar → Ejecutar → Verificar → Publicar**.
