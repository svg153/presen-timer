# RESEARCH — Fase 02: servidor MCP remoto en Vercel

Investigación de apoyo. **Esta fase está planificada, no ejecutada**: los datos proceden de la
documentación oficial, no de una prueba en el repositorio.

---

## 1. `mcp-handler` v2

Adaptador HTTP que convierte una definición de servidor MCP en un manejador estándar de la web:

```ts
// api/mcp.ts
import { createMcpHandler } from 'mcp-handler';

const handler = createMcpHandler((server) => {
  server.registerTool('timer_set_sections', { description, inputSchema }, async (args) => ({ ... }));
});

export { handler as GET, handler as POST };
```

| Aspecto | Valor |
|---------|-------|
| Requisitos | Node 20+, `@modelcontextprotocol/server@2`, `zod@4.2.0+` |
| Transporte | Streamable HTTP |
| Acoplamiento a framework | **Ninguno**: devuelve `(Request) => Promise<Response>` |
| Compatibilidad | Next.js, Nuxt/Nitro, SvelteKit, Hono y frameworks sobre Vite |

**La v2 eliminó** el transporte HTTP+SSE heredado y la configuración de Redis integrada.

**Nota sobre Zod:** la fase 01 ya subió el proyecto a `zod@4.6.5` porque el SDK 1.30 lo exigía. El
requisito de `zod@4.2.0+` de esta fase ya está cubierto, lo cual es un buen indicio de que el SDK v1 y
`mcp-handler` v2 convergen en el mismo rango.

---

## 2. Vercel con un proyecto que no es Next.js

- Un directorio **`/api` en la raíz del proyecto** se detecta como funciones serverless para cualquier
  proyecto Node o Vite.
- El formato del manejador es el de la plataforma:

```ts
export default async function (request: Request) {
  return new Response('...');
}
```

- `vite-plugin-vercel` formaliza la integración si se quiere algo más declarativo.
- Prueba local: `npx vercel dev`. Despliegue: `npx vercel deploy --prod`.

### Diferencia de despliegue frente a GitHub Pages

| Aspecto | GitHub Pages (fase 01, se mantiene) | Vercel (esta fase) |
|---------|--------------------------------------|---------------------|
| Base del bundle | `VITE_BASE_PATH=/presen-timer/` | `VITE_BASE_PATH=/` |
| Enrutado de la SPA | `cp dist/index.html dist/404.html` | `rewrites` a `/index.html` en `vercel.json` |
| Código de servidor | No | Sí (`/api`) |
| Coste | Gratis | Capa gratuita; puede requerir tarjeta |

---

## 3. Estado compartido: Upstash Redis

Un servidor MCP remoto **no recuerda nada entre peticiones**. Pero el flujo necesita recordar, durante
unos minutos, qué sesión pertenece a qué pestaña.

| Aspecto | Valor |
|---------|-------|
| Origen | Vercel Marketplace (Vercel KV se migró a Upstash a finales de 2024) |
| Capa gratuita | Permanente |
| Bases de datos | 10 |
| Almacenamiento | 256 MB por base |
| Comandos | 500 000 al mes |
| Ancho de banda | 10 GB |
| Tarjeta de crédito | **No** |
| Acceso | REST/HTTP — ideal para serverless y edge |

### Qué se guarda

| Clave | Valor | Caducidad |
|-------|-------|-----------|
| `pair:<código>` | `{ sessionId, createdAt }` | 10 minutos |
| `session:<id>` | `{ lastSeenAt, connected }` | 10 minutos desde el último latido |

Nada más. **No se guarda el contenido de la presentación**: eso se queda en el navegador del usuario.

---

## 4. El problema del canal lateral

Es el punto delicado de esta fase. Un servidor serverless **no puede abrir una conexión hacia una
pestaña**: la petición dura milisegundos y no hay proceso persistente.

```
Agente ──HTTP──► /api/mcp ──► ??? ──► pestaña del presentador
                              ▲
                              └── aquí está el problema
```

### Opciones evaluadas

| Opción | Ventaja | Inconveniente |
|--------|---------|---------------|
| **La pestaña llama a casa** (sondeo largo o SSE saliente hacia Vercel) | Funciona con serverless | Latencia y consumo de invocaciones |
| Servicio WebSocket persistente aparte (Fly.io, Railway, Cloudflare Durable Objects) | Empuje real | Ya no es "solo Vercel"; otro servicio y otro coste |
| El agente escribe y la pestaña sondea `/api/poll` cada segundo | Muy simple | Hasta 1 s de retardo; consumo de invocaciones |

### Recomendación

Empezar por **la pestaña llama a casa con SSE saliente** y degradar a sondeo si la plataforma corta las
conexiones largas. El retardo aceptable para gobernar un temporizador es de un segundo; no hace falta
empuje instantáneo.

**Esta decisión debe confirmarse al empezar la fase 02**, porque determina la estructura del endpoint.

---

## 5. Emparejamiento y control de acceso

Flujo propuesto:

1. El usuario abre la app en Vercel y pulsa "Conectar con un agente".
2. La app genera un **código de 6 dígitos** y lo muestra en pantalla, junto con la URL del endpoint MCP.
3. El usuario se lo dicta al agente, que llama a `session_pair` con ese código.
4. El servidor crea la sesión y devuelve un **token de sesión** al agente.
5. El resto de herramientas exigen ese token.

### Por qué no un token estático

Un token fijo tendría que estar en la configuración del cliente MCP, en el repositorio o en la
documentación. En un repositorio público eso equivale a no tener autenticación. El código efímero
**caduca en 10 minutos** y solo lo conoce quien lo está viendo en pantalla.

### Límites de seguridad a implementar

- Máximo de intentos de emparejamiento por IP (evitar fuerza bruta sobre 6 dígitos).
- El token de sesión caduca con la sesión.
- El endpoint MCP **no** acepta comandos sin token válido.
- Los secretos (URL de Upstash, token REST) viven en variables de entorno de Vercel.

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| El canal lateral es más difícil de lo previsto | Sondeo como plan B; validar el canal antes de construir el resto |
| Coste inesperado en Vercel | Vigilar invocaciones; el sondeo es lo que más consume |
| `mcp-handler` v2 cambia de API | Fijar versión y tener el catálogo de herramientas ya desacoplado |
| Divergencia entre la app local y la remota | `shared/mcp-protocol.js` es el único contrato para ambos |
| Fuerza bruta sobre el código de emparejamiento | Límite de intentos, caducidad de 10 minutos, códigos de un solo uso |
