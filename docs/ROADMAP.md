# Roadmap — presen-timer

Features priorizadas con especificaciones accionables. Los agentes deben trabajar en orden **P0 → P1 → P2**, una feature por PR, siguiendo la skill `timer-feature`.

Leyenda de estado: 📋 especificada · 🚧 en curso · ✅ hecha · ⏸️ postergada (requiere análisis profundo)

---

## P0 — Fundamentos y correcciones

### 1. Precisión del timer ✅

**Problema**: `setInterval` de 1000ms deriva (acumula retraso real; en una charla de 30 min puede desviar >10s).

**Spec**:
- Guardar `targetEndTime = Date.now() + timeRemaining * 1000` al iniciar/reanudar.
- En cada tick, calcular `timeRemaining = Math.round((targetEndTime - Date.now()) / 1000)`.
- Al pausar, guardar el restante; al reanudar, recalcular `targetEndTime`.
- Mantener el intervalo en 1000ms (o 250ms para suavidad) pero la fuente de verdad es el timestamp.

**Criterios de aceptación**:
- [ ] Tras 5 minutos corriendo, el tiempo mostrado coincide con un reloj real (±1s).
- [ ] Pausar/reanudar no altera el tiempo restante.
- [ ] Cambio de pestaña (throttling del navegador) no desvía el timer.

**Archivos**: `src/hooks/useTimer.ts`

---

### 2. Tiempo extra / cuenta negativa ✅

**Problema**: al agotarse una sección salta automáticamente a la siguiente. En charlas reales, el ponente necesita ver cuánto se ha pasado.

**Spec**:
- Nueva opción `autoAdvance: boolean` (por defecto `true` para no romper comportamiento actual).
- Si `autoAdvance === false`: al llegar a 0, el timer sigue contando en negativo (mostrado en rojo, p. ej. `text-red-500`), sin saltar de sección. El usuario avanza manualmente.
- El tiempo negativo cuenta para las estadísticas futuras (P2-9).
- Toggle visible en la pantalla de definición de secciones y accesible durante la ejecución.

**Criterios de aceptación**:
- [ ] Con autoAdvance off, la sección muestra `-00:05` en rojo tras agotarse.
- [ ] El progreso total no retrocede con tiempo negativo (clamp a 100%).
- [ ] Con autoAdvance on, comportamiento idéntico al actual.

**Archivos**: `src/hooks/useTimer.ts`, `src/components/TimerSection.tsx`, `src/components/SectionInput.tsx`, `src/utils/timerUtils.ts`

---

### 3. Atajos de teclado ✅

**Spec**:
- `Espacio` → play/pausa
- `←` / `→` → sección anterior/siguiente
- `R` → reset sección actual
- `F` → fullscreen
- `+` → añadir 1 minuto extra

**Detalles**:
- Hook nuevo `src/hooks/useKeyboardShortcuts.ts` que reciba los callbacks.
- Ignorar atajos cuando el foco está en un input/textarea (comprobar `event.target`).
- `preventDefault` en Espacio y flechas (evitar scroll).
- Mostrar ayuda de atajos (dialog con `?` o botón en Navbar).

**Criterios de aceptación**:
- [ ] Todos los atajos funcionan con secciones cargadas.
- [ ] Escribir en el textarea de secciones no dispara atajos.
- [ ] Existe ayuda visible con la lista de atajos.

**Archivos**: `src/hooks/useKeyboardShortcuts.ts` (nuevo), `src/pages/Index.tsx`, `src/components/Navbar.tsx`

---

### 4. Edición de secciones ✅

**Problema**: una vez creadas las secciones solo se puede navegar; editar requiere reescribir todo el bloque de texto.

**Spec**:
- En `SectionsList`, cada sección con acciones: editar nombre/duración (inline o dialog), eliminar, y reordenar (botones ↑/↓; drag-and-drop opcional).
- Al editar durante la ejecución: si se edita la sección actual, recalcular `timeRemaining` proporcionalmente o resetearla (decisión del implementador, documentar con `[AI-DECISION]`).
- Añadir sección nueva al final desde el sidebar.
- Persistir cambios en localStorage con el mismo `STORAGE_KEY`.

**Criterios de aceptación**:
- [ ] Editar nombre y duración de cualquier sección.
- [ ] Eliminar sección (con confirmación si es la actual).
- [ ] Reordenar secciones.
- [ ] Los cambios sobreviven a un reload.

**Archivos**: `src/components/SectionsList.tsx`, `src/hooks/useTimer.ts`, `src/utils/timerUtils.ts`

---

## P1 — Valor de usuario

### 5. Presets múltiples ✅

- Guardar la lista actual como preset con nombre; cargar preset desde un select; eliminar preset.
- Nueva `STORAGE_KEY` (`presentation-timer-presets`): `{ name, sections }[]`.
- UI: botones en `SectionInput` (guardar) y select encima del textarea (cargar).
- **Criterios**: crear/cargar/eliminar presets; el preset activo se marca; sobrevive a reload.

### 6. Import / export JSON ✅

- Exportar preset actual (o todos) a archivo `.json` descargable; importar con `<input type="file">`.
- Validar el JSON importado (nombre string, duración number > 0); error visible con toast si es inválido.
- **Criterios**: round-trip export→import idéntico; JSON inválido muestra error y no rompe el estado.

### 7. PWA + Wake Lock ✅

- Convertir en PWA instalable: manifest + service worker (preferir `vite-plugin-pwa`).
- **Screen Wake Lock API** activa mientras el timer corre (`navigator.wakeLock.request('screen')`), liberar al pausar/terminar; reintentar al volver la visibilidad.
- **Criterios**: instalable desde el navegador; pantalla no se apaga con timer corriendo; funciona offline tras primera carga.

### 8. Modo presentador 📋

- Vista fullscreen minimalista: solo nombre de sección + tiempo gigante + barra de progreso.
- **Semáforo por color de fondo**: verde (>60s), ámbar (≤60s), rojo (≤10s o negativo) — umbrales configurables.
- Entrar/salir con `F` o botón; ocultar cursor tras 3s de inactividad.
- **Criterios**: fullscreen real; colores cambian en los umbrales; legible a distancia (texto ≥ 20vh).

---

## P2 — Diferenciación

### 9. Estadísticas de presentación 📋

- Al terminar, resumen: tiempo planificado vs real por sección (requiere registrar timestamps de inicio/fin de cada sección).
- Vista con `recharts` (ya en dependencias) o tabla simple; opción de copiar resumen.

### 10. Plantillas de formato 📋

- Presets incluidos de fábrica: Lightning talk (5m), Charla (20m), Taller (90m), Defensa TFG (15m)... seleccionables sin configurar nada.

### 11. i18n + tema claro/oscuro 📋

- i18n ES/EN (extraer strings a diccionarios; evaluar `react-i18next` vs diccionario propio — decidir con `[AI-DECISION]`).
- Tema claro/oscuro con `next-themes` (ya en dependencias).

### 12. Mando remoto 📋 ⏸️

- Controlar el timer desde el móvil (QR + WebRTC/BroadcastChannel o pequeño servidor).
- **Postergada**: requiere decisión de arquitectura (¿sin servidor con BroadcastChannel?, ¿peerjs?, ¿backend?) que rompería los flujos actuales. Analizar cuando P0/P1 estén estables.

---

## Notas para agentes

- Una feature por PR, título `feat: <feature>` o `fix: <feature>`.
- Toda decisión con opciones → `[AI-DECISION]` en la PR (issue maestro #4).
- Actualizar el estado (📋/🚧/✅) de esta tabla en cada PR que toque una feature.
- Si una feature de P1/P2 requiere análisis profundo, postérgala con ⏸️ y crea ticket.

