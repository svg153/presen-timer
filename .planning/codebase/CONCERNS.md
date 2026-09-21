# CONCERNS — presen-timer

Riesgos, deudas y zonas frágiles conocidas en el punto de partida.

## 1. `public/notification.mp3` no es audio

**Severidad:** media (funcional)
**Evidencia:** el fichero pesa 149 bytes y su contenido es texto, no audio.

El aviso de fin de sección llama a `audioRef.current.play()`, que falla y se traga el error
(`.catch(err => console.error(...))`). Resultado: **la sección termina en silencio y nadie se entera**.
Es justo el fallo que un temporizador de presentaciones no debería tener.

**Mitigación en la fase 01:** ninguna. Requiere que el usuario aporte un mp3 real.
**Registrado en:** `README.md` y `.planning/ROADMAP.md` (fase 04).

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

## 4. 55 avisos de Dependabot

**Severidad:** baja en la práctica, alta en apariencia

24 altos, 27 moderados, 4 bajos. Esperable en un proyecto de un año con un stack de 2025.
El riesgo real de ejecución es bajo porque **no hay servidor**: todo corre en el navegador del usuario
y el paquete es de código abierto, sin datos sensibles. Aun así, un repositorio público con 55 avisos
proyecta mala imagen.

**Mitigación:** ofrecido como PR independiente. No forma parte de la fase 01 para no mezclar un
`npm audit fix --force` (que rompe versiones mayores) con una funcionalidad nueva.

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

## 6. El typecheck no está en el pipeline y estaba roto

**Severidad:** media

`package.json` define `"build": "vite build"`, **sin `tsc`**. esbuild borra los tipos sin
comprobarlos, así que `.github/workflows/ci.yml` (que solo corre `lint` + `build`) puede salir en
verde con el proyecto sin typechequear.

Y de hecho estaba roto: `src/i18n/index.tsx` (PR #17) usa `String.prototype.replaceAll`, que es
**ES2021**, mientras `tsconfig.app.json` declaraba `"lib": ["ES2020", "DOM", "DOM.Iterable"]`.
Resultado: `npx tsc -p tsconfig.app.json --noEmit` fallaba con

```
src/i18n/index.tsx(59,23): error TS2550: Property 'replaceAll' does not exist on type 'string'.
```

**Mitigación:** se subió `lib` a `ES2021` (cambio puramente aditivo; `target` sigue en `ES2020`, así
que la sintaxis emitida no cambia). Se detectó al rebasar la PR #8 sobre `main`.

**Deuda pendiente:** añadir `tsc --noEmit` (y `npm run test`) a `.github/workflows/ci.yml`, que
además sigue en `actions/checkout@v4` / `actions/setup-node@v4` con Node 20.

## 7. La lógica del temporizador no es testeable de forma aislada

**Severidad:** media

El bucle de cuenta atrás vive dentro de un `useEffect` que depende de `useState`, con avance automático,
aviso y reproducción de audio mezclados. No se puede probar sin montar el componente entero.

**Riesgo para la fase 01:** el control remoto pasa por los mismos callbacks, así que un fallo en el
avance automático seguirá siendo invisible para las pruebas unitarias.

**Registrado en:** fase 04 (extraer un reducer puro).

## 7. Doble fichero de bloqueo

**Severidad:** baja

Conviven `package-lock.json` (npm) y `bun.lockb`. La CI usa `npm ci`. Si alguien instala con Bun, los
dos pueden divergir. La fase 01 añade dependencias, así que debe actualizar **`package-lock.json`**.

## 8. Dependencias del scaffold sin usar

**Severidad:** baja

`recharts`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `vaul`, `cmdk`, `next-themes`,
`@tanstack/react-query`… no se usan. Inflan la instalación y la superficie de avisos de seguridad.
No se limpian en la fase 01 para no ampliar el alcance.

## 9. `requestFullscreen()` exige gesto de usuario

**Severidad:** media (limita la funcionalidad remota)

No se puede activar la pantalla completa desde un agente. Por eso `timer_toggle_fullscreen` **no** se
expone como herramienta MCP: una herramienta que siempre falla es peor que su ausencia.

## 10. Instalación de dependencias de servidor en un proyecto estático

**Severidad:** baja

La fase 01 añade `@modelcontextprotocol/sdk` y `ws` a las dependencias del proyecto. Riesgo: que acaben
en el bundle del navegador y engorden la demo pública.

**Mitigación:** el directorio `mcp/` nunca se importa desde `src/`, así que Vite no lo incluye. Se
verifica inspeccionando `dist/` después del build (TST-05).
