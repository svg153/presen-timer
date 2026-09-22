# ARCHITECTURE — presen-timer

## Vista general (estado inicial, antes de la fase 01)

```
main.tsx
└─ App.tsx
   └─ QueryClientProvider → TooltipProvider → BrowserRouter(basename)
      └─ Index.tsx
         ├─ useTimer()            ← todo el estado y la lógica del temporizador
         ├─ Navbar                ← barra superior + botón de panel lateral
         ├─ SectionsList          ← panel lateral con las secciones
         ├─ SectionInput          ← formulario de definición (cuando no hay secciones)
         └─ TimerSection          ← cuenta atrás, controles y progreso
```

Todo el estado vive en el hook `useTimer` y se pasa hacia abajo por props. No hay contexto global,
ni store, ni reducer.

## Modelo de estado

```ts
interface TimerSection { name: string; duration: number }   // duration en segundos

interface TimerState {
  sections: TimerSection[]
  currentSectionIndex: number
  timeRemaining: number
  isRunning: boolean
  isWarning: boolean
  isFullscreen: boolean
  isSidebarOpen: boolean
}
```

## Flujo del temporizador

1. `SectionInput` recoge texto libre y lo convierte con `parseSections` (`Nombre: 5m` por línea,
   se descartan las líneas cuya duración resultante sea 0).
2. `setSections` reemplaza la lista, reinicia el índice a 0, fija `timeRemaining` a la duración de la
   primera sección, para el temporizador y **persiste en `localStorage`**.
3. `useEffect` sobre `state.isRunning` crea un `setInterval` de 1 000 ms. Cada tick:
   - resta 1 segundo,
   - si llega a 0: reproduce el aviso sonoro, avanza a la siguiente sección (o termina si era la última),
   - recalcula `isWarning` (≤ 30 s y > 0).
4. `Index.tsx` calcula el progreso con `calculateProgress` y lo pasa a `TimerSection`.

## Persistencia

- Clave: `presentation-timer-sections` en `localStorage`.
- Se escribe en `setSections` (único punto de escritura).
- Se lee una sola vez, al montar `Index.tsx`, con `loadFromLocalStorage`.

## Rutas

- `/` → `Index`
- `*` → `NotFound` (enlace de vuelta a la home construido con `import.meta.env.BASE_URL`)

`basename` se deriva de `BASE_URL` quitando la barra final, de modo que el enrutado funciona igual en
`/` y en `/presen-timer/`.

## Rutas de activos

Todos los activos pasan por `import.meta.env.BASE_URL`:

- `src/hooks/useTimer.ts` → `new Audio(`${BASE_URL}notification.wav`)`
- `index.html` → `%BASE_URL%favicon.ico`, `%BASE_URL%og-image.png`

## Limitaciones estructurales relevantes para la fase 01

1. **No existe un punto de entrada programático al estado.** Los únicos puntos de entrada son los
   callbacks que devuelve `useTimer`. Cualquier control externo tiene que pasar por ellos.
2. **La lógica de tick no es testeable de forma aislada** porque vive dentro de `useEffect` sobre `useState`.
   Es la deuda que la fase 04 propone resolver extrayendo un reducer puro.
3. **No hay backend**, así que no hay dónde alojar un servidor MCP en el despliegue de producción.
