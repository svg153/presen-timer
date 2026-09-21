# CONCERNS — presen-timer

Riesgos, deudas y zonas frágiles conocidas en el punto de partida.

## 1. ~~`public/notification.mp3` no es audio~~ — RESUELTO

**Severidad:** media (funcional) → **cerrado**
**Evidencia:** el fichero pesaba 149 bytes y su contenido era texto, no audio.

El aviso de fin de sección llama a `audioRef.current.play()`, que fallaba y se tragaba el error
(`.catch(err => console.error(...))`). Resultado: **la sección terminaba en silencio y nadie se enteraba**.
Es justo el fallo que un temporizador de presentaciones no debería tener.

**Resolución:** se sustituyó por `public/notification.wav` (22 350 bytes, WAV PCM 44 100 Hz mono 16 bit,
0,25 s), tomado de [`akx/Notifications`](https://github.com/akx/Notifications) (`WAV/Alarmed.wav`), publicado
bajo **CC0 Public Domain** — sin obligación de atribución. Se eligió WAV frente a MP3/OGG porque lo decodifica
cualquier navegador sin depender del códec y el coste de 22 KB es despreciable.
Verificado en navegador: `canplaythrough` con `readyState = 4` y `play()` resuelto (antes: `NotSupportedError`).
El formato va declarado en tres sitios que **deben cambiarse en bloque** si algún día se renombra:
`src/hooks/useTimer.ts`, el `includeAssets` y el `workbox.globPatterns` de `vite.config.ts`.

## 2. Sin backend y sin canal de entrada

**Severidad:** alta (limita el producto)

Toda la app vive en la pestaña. No hay ningún punto por el que entre información del exterior, ni forma
de observar el estado desde fuera. Esta es exactamente la carencia que aborda la fase 01, y es también
la razón por la que el control remoto requiere un proceso local o un servicio alojado: **no se puede
saltar la barrera del navegador**.

## 3. Contenido mixto: HTTPS no puede hablar con `ws://localhost`

**Severidad:** alta (limita el diseño)

Una página servida por HTTPS no puede abrir un WebSocket en `ws://localhost`. No hay bandera del
navegador ni directiva CSP que lo permita en producción. Alternativas: certificado propio con
`wss://localhost`, o un proxy inverso TLS local. Ninguna es aceptable como requisito para el usuario.

**Consecuencia asumida:** el control remoto de la fase 01 solo funciona desde `http://localhost`.
La web pública de GitHub Pages seguirá siendo una demo estática. Está documentado y la interfaz lo
explicará en lugar de fallar en silencio.

## 4. ~~53 avisos de Dependabot~~ — RESUELTO

**Severidad:** baja en la práctica, alta en apariencia → **cerrado**

Había 22 altos, 27 moderados y 4 bajos repartidos en 17 paquetes transitivos. Esperable en un proyecto
de un año con un stack de 2025. El riesgo real de ejecución era bajo porque **no hay servidor**: todo
corre en el navegador del usuario y el paquete es de código abierto, sin datos sensibles. Aun así, un
repositorio público con 53 avisos proyectaba mala imagen.

**Resolución:** `npm audit` pasó de **23 a 0**. El árbol vulnerable entero desapareció, no se parcheó:
`npm update` podó 72 paquetes y la subida de los majors acotados terminó el trabajo —
`vite@5.4.10 → 8.3.0`, `vitest@3.2.7 → 5.0.1`, `react-router-dom@6.30.6 → 7.18.4`,
`@vitejs/plugin-react-swc@3.11.0 → 4.3.3`. Verificado con `npm audit --json`: `total: 0` sobre 836
dependencias (antes 863).

**Los majors que se dejaron fuera a propósito** (riesgo alto, sin aviso de seguridad que los exija):
React 19, `@types/react` 19, Tailwind 4 (reescritura CSS-first que rompería `tailwind.config.ts` y
shadcn), TypeScript 7 (reescritura en Go), ESLint 10, `recharts` 3, `sonner` 2, `vaul` 1,
`tailwind-merge` 3, `date-fns` 4, `next-themes` 0.4, `lucide-react` 1.

**Requisito derivado:** `vite@8` exige Node `^20.19.0 || >=22.12.0` y `vitest@5` exige
`^22.12.0 || ^24.0.0 || >=26.0.0`, así que **Node 22 pasa a ser obligatorio** en `ci.yml` y
`deploy-pages.yml`.

## 5. Avisos de ESLint preexistentes

**Severidad:** muy baja

7 avisos (`react-refresh/only-export-components`), seis en el scaffold de shadcn
(`src/components/ui/badge.tsx`, `button.tsx`, `form.tsx`, `navigation-menu.tsx`, `sidebar.tsx`,
`toggle.tsx`) y uno en `src/i18n/index.tsx`, que lo añadió la PR #17 en `main` al exportar el hook
`useI18n` junto al provider. Son deuda heredada, no regresiones: `npm run lint` sale con **0 errores**.

Los 3 errores que había originalmente (una regla `no-empty-object-type` en
`src/components/ui/textarea.tsx` y en `tailwind.config.ts`) los corrigió la PR #5 en `main`, así que
la fase 01 no tuvo que tocarlos.

**Riesgo colateral:** como `npm run lint` no sale completamente limpio, es fácil colar avisos nuevos
sin darse cuenta. La fase 01 **compara contra el baseline** y no añade ninguno.

## 6. ~~El typecheck no está en el pipeline y estaba roto~~ — RESUELTO

**Severidad:** media → **cerrado**

`package.json` define `"build": "vite build"`, **sin `tsc`**. esbuild borra los tipos sin
comprobarlos, así que `.github/workflows/ci.yml` (que solo corría `lint` + `build`) podía salir en
verde con el proyecto sin typechequear.

Y de hecho estaba roto: `src/i18n/index.tsx` (PR #17) usa `String.prototype.replaceAll`, que es
**ES2021**, mientras `tsconfig.app.json` declaraba `"lib": ["ES2020", "DOM", "DOM.Iterable"]`.
Resultado: `npx tsc -p tsconfig.app.json --noEmit` fallaba con

```
src/i18n/index.tsx(59,23): error TS2550: Property 'replaceAll' does not exist on type 'string'.
```

**Resolución (dos partes):**
1. Se subió `lib` a `ES2021` (cambio puramente aditivo; `target` sigue en `ES2020`, así que la
   sintaxis emitida no cambia).
2. Se cerró la brecha de proceso: nuevo script `npm run typecheck`
   (`tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`) y **`ci.yml` ahora
   ejecuta Typecheck y Test** entre Lint y Build. De paso se subió el workflow a
   `actions/checkout@v5` / `actions/setup-node@v5` con **Node 22** (obligatorio para `vite@8`).

⚠️ `npx tsc -p tsconfig.json` **no** sirve como comprobación: es un proyecto solución (`files: []`),
así que hay que apuntar a `tsconfig.app.json` y `tsconfig.node.json` por separado — que es justo lo
que hace el script.

## 7. La lógica del temporizador no es testeable de forma aislada

**Severidad:** media

El bucle de cuenta atrás vive dentro de un `useEffect` que depende de `useState`, con avance automático,
aviso y reproducción de audio mezclados. No se puede probar sin montar el componente entero.

**Riesgo para la fase 01:** el control remoto pasa por los mismos callbacks, así que un fallo en el
avance automático seguirá siendo invisible para las pruebas unitarias.

**Registrado en:** fase 04 (extraer un reducer puro).

## 8. Doble fichero de bloqueo

**Severidad:** baja

Conviven `package-lock.json` (npm) y `bun.lockb`. La CI usa `npm ci`. Si alguien instala con Bun, los
dos pueden divergir. La fase 01 añade dependencias, así que debe actualizar **`package-lock.json`**.

## 9. Dependencias del scaffold sin usar

**Severidad:** baja

`recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `vaul`, `cmdk`, `next-themes`,
`@tanstack/react-query`… no se usan. Inflan la instalación y la superficie de avisos de seguridad.
No se limpian en la fase 01 para no ampliar el alcance. (Nota: el `npm update` de la limpieza de
dependencias ya podó 72 paquetes, muchos de ellos de este grupo.)

## 10. `requestFullscreen()` exige gesto de usuario

**Severidad:** media (limita la funcionalidad remota)

No se puede activar la pantalla completa desde un agente. Por eso `timer_toggle_fullscreen` **no** se
expone como herramienta MCP: una herramienta que siempre falla es peor que su ausencia.

## 11. Instalación de dependencias de servidor en un proyecto estático

**Severidad:** baja

La fase 01 añade `@modelcontextprotocol/sdk` y `ws` a las dependencias del proyecto. Riesgo: que acaben
en el bundle del navegador y engorden la demo pública.

**Mitigación:** el directorio `mcp/` nunca se importa desde `src/`, así que Vite no lo incluye. Se
verifica inspeccionando `dist/` después del build (TST-05).
