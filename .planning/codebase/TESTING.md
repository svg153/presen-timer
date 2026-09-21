# TESTING — presen-timer

## Estado inicial

**No hay pruebas.** No existe framework, ni script `test`, ni carpeta de tests, ni CI que ejecute nada
más allá de `npm run build`.

Verificación disponible en el punto de partida:

| Mecanismo | Qué cubre |
|-----------|-----------|
| `npm run build` | Que el proyecto compila y produce `dist/` |
| `npm run lint` | Reglas de ESLint (0 errores; 7 avisos heredados: 6 del scaffold + 1 de `src/i18n/index.tsx`) |
| `npm run dev` / `npm run preview` | Verificación manual en navegador |
| Workflow de Pages | Que el build se despliega correctamente |

## Qué añade la fase 01

| Mecanismo | Qué cubre |
|-----------|-----------|
| **Vitest** (`npm run test`) | Lógica pura: `timerUtils` y el mapeo de comandos MCP |
| **Verificación end-to-end** | Un cliente MCP real controlando una pestaña abierta con Playwright |

## Estrategia

Se prueba por capas, de dentro hacia fuera:

1. **Funciones puras** (`timerUtils`): parseo de duraciones, parseo de secciones, formateo, totales,
   progreso y round-trip con `localStorage`.
2. **Mapeo de comandos** (`src/mcp/commands.ts`): cada comando MCP se traduce a la llamada correcta
   sobre los callbacks del temporizador, y los argumentos inválidos producen un error en vez de una
   llamada silenciosa.
3. **Integración real**: servidor MCP + cliente MCP por stdio + pestaña real.

### Lo que **no** se prueba en la fase 01

- El bucle de tick de `useTimer` (vive dentro de un `useEffect`; requiere extraer un reducer).
- Renderizado de componentes con Testing Library (no aporta valor frente a la verificación end-to-end
  para esta funcionalidad).
- El despliegue de Pages (se comprueba el build, no el sitio).

## Deuda

La ausencia de un reducer puro es la razón principal de que la lógica del temporizador no esté cubierta.
Está registrada como candidata de la fase 04 en `.planning/ROADMAP.md`.
