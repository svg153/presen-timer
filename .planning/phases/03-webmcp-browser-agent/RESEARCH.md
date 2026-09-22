# RESEARCH — Fase 03: WebMCP

Investigación de apoyo. **Esta fase está planificada, no ejecutada.**

---

## 1. Qué es WebMCP

Una API del navegador que permite a una página **declarar herramientas estructuradas** que un agente
puede invocar. Sustituye la práctica actual de que el agente interprete el DOM a ciegas por un contrato
explícito: nombre, descripción y esquema de argumentos.

```js
// forma aproximada; la API sigue evolucionando
document.modelContext.provideContext({
  tools: [
    {
      name: 'timer_start',
      description: 'Inicia la cuenta atrás del temporizador',
      inputSchema: { type: 'object', properties: {} },
      async execute() { /* … */ }
    }
  ]
});
```

## 2. Estado de la especificación

| Hito | Detalle |
|------|---------|
| Chrome 146 Canary | Primera implementación, tras una bandera |
| **Chrome 149** | **Origin trial público** (anunciado en Google I/O 2026) |
| Chrome 150 | Empieza a **deprecar `navigator.modelContext`** en favor de `document.modelContext`; el origin trial sigue sirviendo el nombre antiguo por compatibilidad |
| Estandarización | **W3C Community Group** con Google, Microsoft, Mozilla y Apple |
| Implementaciones | **Solo Chrome** |

**Consecuencia:** hay que detectar la capacidad, no asumirla. Y hay que admitir **los dos nombres** de la
API, porque el nombre antiguo sigue funcionando en el origin trial mientras el nuevo aparece.

```ts
const modelContext = document.modelContext ?? navigator.modelContext ?? null;
```

Google publica además un `webmcp-sdk` que envuelve la API.

---

## 3. La limitación que define el alcance

Las herramientas de WebMCP **solo las puede invocar el agente propio del navegador** — hoy, Gemini en
Chrome. **Claude Code y GitHub Copilot CLI no pueden.**

Es decir:

| Agente | ¿Puede usar WebMCP? | ¿Puede usar MCP? |
|--------|---------------------|-------------------|
| Gemini en Chrome | Sí | No (no es un cliente MCP) |
| Claude Code | **No** | Sí |
| GitHub Copilot | **No** | Sí |
| Cursor | **No** | Sí |

Por eso esta fase es **complementaria**. No se puede plantear como sustituta de la fase 01.

---

## 4. La ventaja inesperada: funciona sobre HTTPS

Es el punto que hace que esta fase merezca la pena para este proyecto en concreto.

| Vía | ¿Funciona desde `https://svg153.github.io/presen-timer/`? |
|-----|------------------------------------------------------------|
| Fase 01 — puente WebSocket local | **No** (contenido mixto) |
| Fase 02 — MCP remoto en Vercel | Sí, pero con otro despliegue y otro servicio |
| **Fase 03 — WebMCP** | **Sí, en el despliegue actual** |

WebMCP no abre ninguna conexión local: el agente vive dentro del navegador y llama directamente a las
herramientas de la página. **No hay WebSocket, así que no hay contenido mixto.**

Es la única vía de control por agente compatible con el despliegue estático que ya existe y que, por
decisión D-04, no se va a tocar.

---

## 5. Estrategia de implementación

1. **Un único punto de acceso a la API** (por ejemplo `src/mcp/webmcp.ts`), de modo que un cambio de
   nombre o de forma no obligue a tocar toda la aplicación.
2. **Registro derivado de `TIMER_TOOLS`**, el mismo catálogo que usa el servidor MCP. Una sola
   definición de las capacidades de la app.
3. **Reutilización de `applyCommand`** de `src/mcp/commands.ts`. Un comando de WebMCP es idéntico a uno
   que llegó por WebSocket.
4. **Traducción de esquemas**: el catálogo describe los argumentos en Zod; WebMCP probablemente espere
   JSON Schema. El SDK del protocolo ya incluye `zod-to-json-schema` (está en el árbol de dependencias
   desde la fase 01), así que la conversión es directa.
5. **Estado visible** en la interfaz: si el agente del navegador está disponible, se indica; si no, no se
   muestra nada roto.

## 6. Incógnitas a resolver al empezar

| Incógnita | Cómo se resuelve |
|-----------|------------------|
| Forma exacta de la API en la versión que se soporte | Probar en Chrome con el origin trial activo |
| Si acepta JSON Schema o Zod | Convertir con `zod-to-json-schema`; es el camino seguro |
| Ciclo de vida del registro (¿se puede dar de baja?) | Comprobar si existe `unregister` o si basta con volver a proporcionar el contexto |
| Cómo se depura | Chrome DevTools tiene una vista de herramientas del agente en las versiones con la función activa |

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| La API cambia antes de que se implemente | Detección de capacidad y un único punto de acceso |
| Solo funciona en Chrome | Degradación elegante; el resto de vías siguen existiendo |
| Se confunde con MCP y se espera que Claude Code lo use | Documentarlo con claridad en el README y en la interfaz |
| Doble definición de herramientas que se desincroniza | Derivar siempre de `TIMER_TOOLS` |
