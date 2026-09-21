# SUMMARY — Incorporación al proyecto

Guía breve para quien llegue nuevo a `presen-timer` y a su planificación.

## Qué es este proyecto

Un temporizador de presentaciones que corre entero en el navegador. Se define una lista de secciones
(`Introducción: 3m`, `Demo: 10m`…) y la aplicación lleva la cuenta atrás, avanza sola y avisa cuando
queda poco. Nació como prueba de concepto para una charla en Málaga y hoy es un repositorio público con
una demo desplegada.

## Dónde está todo

| Sitio | Qué hay |
|-------|---------|
| `https://svg153.github.io/presen-timer/` | La demo pública (GitHub Pages) |
| `src/` | La aplicación |
| `.planning/` | La planificación: proyecto, requisitos, hoja de ruta, fases e investigación |
| `.github/workflows/deploy-pages.yml` | El despliegue automático |

## Por dónde empezar a leer

1. `.planning/PROJECT.md` — qué es y qué se ha decidido.
2. `.planning/REQUIREMENTS.md` — qué debe hacer exactamente.
3. `.planning/ROADMAP.md` — en qué orden.
4. `.planning/STATE.md` — por dónde va ahora mismo.
5. `.planning/research/MCP-RESEARCH.md` — la investigación que sostiene las decisiones.

## Cómo se trabaja

Se sigue el ciclo de GSD: **Discutir → Planificar → Ejecutar → Verificar → Publicar**. Los artefactos
de `.planning/` son la fuente de verdad; el código se escribe para cumplir los requisitos con ID.

```bash
npm install          # dependencias
npm run dev          # servidor de desarrollo en http://localhost:8080/presen-timer/
npm run mcp          # servidor MCP + puente WebSocket (fase 01)
npm run test         # pruebas (fase 01)
npm run test:e2e     # aceptación MCP; requiere navegador abierto (fase 01)
npm run lint         # ESLint (0 errores, 6 avisos heredados)
npm run build        # build de producción
```

## Cómo se usa el control remoto (fase 01)

1. Arrancar la app: `npm run dev`.
2. Arrancar el puente: `npm run mcp`.
3. Registrar el servidor en el cliente MCP (Claude Code, Copilot…) como servidor **stdio** que ejecuta
   `npm run mcp`.
4. Pedirle al agente cosas como *"arma una charla de 20 minutos con cuatro secciones y arráncala"*.

## Las tres cosas que hay que saber antes de tocar nada

1. **La web pública es HTTPS.** Una página HTTPS no puede abrir un WebSocket en `ws://localhost`.
   Por eso el control remoto solo funciona con la app en `http://localhost`. No es un fallo: es una
   restricción del navegador sin solución razonable.
2. **El navegador no puede ser un servidor MCP.** Siempre hace falta un proceso intermedio. Es la razón
   de que exista `mcp/server.mjs`.
3. **En stdio, `stdout` es el canal del protocolo.** Cualquier registro de depuración va a `stderr`.
   Un `console.log` rompe la conexión con el agente.

## Sobre el instalador de GSD

Los artefactos de `.planning/` se escribieron a mano siguiendo las plantillas oficiales de GSD, en vez de
ejecutar su instalador. El instalador añadiría `.claude/` con 72 *skills*, un fichero de instrucciones y
un directorio de ganchos a un repositorio público, generando un diff de miles de ficheros imposible de
revisar.

Si en algún momento se quiere instalar de verdad:

```bash
npx @opengsd/gsd-core@latest --copilot --local
```

Conviene hacerlo en un commit propio, para que el ruido quede aislado y sea revisable por separado.

## Deudas conocidas

- `public/notification.mp3` es un placeholder de texto: el aviso sonoro no suena.
- 55 avisos de Dependabot (24 altos, 27 moderados, 4 bajos).
- 6 avisos de ESLint heredados del scaffold de shadcn; 0 errores.
- La lógica del temporizador sigue viviendo dentro del hook, sin reducer puro. La PR #6 ya extrajo
  `secondsLeftFromEnd` a `src/utils/timerUtils.ts` y esta fase la cubre con pruebas.

Todo está detallado en `.planning/codebase/CONCERNS.md`.
