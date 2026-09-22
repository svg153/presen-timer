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

### 8. Modo presentador ✅

- Vista fullscreen minimalista: solo nombre de sección + tiempo gigante + barra de progreso.
- **Semáforo por color de fondo**: verde (>60s), ámbar (≤60s), rojo (≤10s o negativo) — umbrales configurables.
- Entrar/salir con `F` o botón; ocultar cursor tras 3s de inactividad.
- **Criterios**: fullscreen real; colores cambian en los umbrales; legible a distancia (texto ≥ 20vh).
- Implementado en #14: overlay `PresenterView`, umbrales persistidos en localStorage, `isFullscreen` sincronizado con evento `fullscreenchange`.

### 13. Edición masiva de secciones (texto) ✅

**Problema**: el formato original del proyecto es pegar texto `Nombre: duración` línea a línea (`SectionInput`), pero una vez creado el temporizador ajustar varias secciones obliga a editarlas una a una con el lápiz de cada fila, y el `+` crea secciones sin tiempo en varios clics.

**Spec**:
- Botón lápiz en la cabecera del sidebar de secciones, a la izquierda del `+`, con el mismo estilo que el lápiz de cada sección.
- Abre un diálogo con **todas las secciones en el formato de texto original**, una por línea: `Nombre: 5m` / `Nombre: 2h` (autopuesto con `sectionsToText(sections)`, el mismo formato de presets/plantillas).
- Copiar/pegar/editar el texto y "Aplicar" reemplaza todas las secciones de golpe (vía `setSections`: vuelve a la sección 1 y detiene el timer, como al cargar un preset).
- Validación estricta en `src/utils/sectionsEditUtils.ts` (`parseSectionsStrict`): a diferencia de `parseSections` (que descarta líneas inválidas en silencio), reporta la línea problemática con su número; error visible por toast y estado intacto.
- Textos de UI en i18n ES/EN (claves `sections.bulk*`).

**Criterios de aceptación**:
- [x] El lápiz de la cabecera abre el editor con las secciones actuales autopuestas en formato texto.
- [x] Pegar una lista `Nombre: 5m` y aplicar reemplaza todas las secciones en dos clics.
- [x] Línea sin `:` o con duración inválida → error visible con el número de línea, secciones sin tocar.
- [x] El formato es round-trip con presets/plantillas (`sectionsToText`/`parseSections`).
- [x] `npm run lint && npm run build` en verde.

- Implementado en #22: `SectionsBulkEditDialog` + `parseSectionsStrict`; lápiz en cabecera de `SectionsList`. `[AI-DECISION]`: `lastIndexOf(':')` permite nombres con dos puntos; errores de validación en inglés (precedente `parseImportedPresets`).

**Archivos**: `src/components/SectionsList.tsx`, `src/components/SectionsBulkEditDialog.tsx` (nuevo), `src/utils/sectionsEditUtils.ts` (nuevo), `src/i18n/en.ts`, `src/i18n/es.ts`

### 14. Preset → cuadro de texto en la home ✅

**Problema**: al seleccionar un preset o plantilla en la página principal (sin temporizador activo), `handleLoadPreset` en `SectionInput` rellena el textarea pero **además** llama a `onSetSections`, lo que lanza la presentación al instante y hace perder la home con el cuadro de texto. El usuario no puede revisar ni ajustar el preset antes de empezar; si quiere editar, debe volver atrás y recargar.

**Spec**:
- Seleccionar un preset/plantilla en la home solo **rellena el textarea** (`setInputText(sectionsToText(...))`) en el formato texto original `Nombre: 5m`; no se crea el temporizador ni se navega.
- "Crear temporizador" sigue siendo la única vía de lanzar la presentación desde la home: con el texto editado o tal cual (enviar directo sin edición sigue costando un clic).
- El total de tiempo y la previsualización parseada (`parsedSections`) se recalculan solos del textarea, como al teclear.
- No cambia la carga de presets **desde el sidebar** (`SectionsList` → `onLoad={onSetSections}`): allí sustituye las secciones activas de golpe (no hay textarea que editar en ese contexto).
- Se mantiene el toast de "preset cargado".

**Criterios de aceptación**:
- [x] Elegir un preset en la home → textarea relleno en formato texto, la home permanece visible, el timer no arranca.
- [x] Editar el texto y pulsar "Crear temporizador" → se lanzan las secciones editadas.
- [x] Pulsar "Crear temporizador" sin editar → se lanzan las secciones del preset tal cual.
- [x] Cargar un preset desde el sidebar sigue reemplazando las secciones activas directamente.
- [x] `npm run lint && npm run build` en verde.

**Archivos**: `src/components/SectionInput.tsx`

Ticket: #25. `[AI-DECISION]`: el mismo `onLoad` de `PresetControls` toma dos semánticas según contexto (home = propuesta editable en el textarea; sidebar = sustitución inmediata) en vez de unificar comportamiento: son flujos distintos del usuario.

---

## P2 — Diferenciación

### 9. Estadísticas de presentación ✅

- Al terminar, resumen: tiempo planificado vs real por sección (requiere registrar timestamps de inicio/fin de cada sección).
- Vista con `recharts` (ya en dependencias) o tabla simple; opción de copiar resumen.
- Implementado en #15: grabador de tiempo real (wall-clock en RUNNING) por sección en `useTimer`, `StatsDialog` con gráfico recharts + tabla de diffs + copiar (tab-separated); auto-abre al terminar y botón manual en controles.

### 10. Plantillas de formato ✅

- Presets incluidos de fábrica: Lightning talk (5m), Charla (20m), Taller (90m), Defensa TFG (15m)... seleccionables sin configurar nada.
- Implementado en #16: 5 plantillas read-only en código (`templateUtils.ts`) agrupadas en el select de presets bajo "Templates"; no se siembran en localStorage (save/delete/export/import solo tocan presets de usuario); cargar una rellena el textarea y crea las secciones.

### 11. i18n + tema claro/oscuro ✅

- i18n ES/EN: diccionario propio + React context (`src/i18n/`, ~101 keys), sin dependencias nuevas. Detección por navegador, persistencia en localStorage, interpolación `{var}`.
- Tema claro/oscuro: paleta GitHub como CSS variables (`:root` + `.dark`) en `index.css`/`tailwind.config.ts` con `<alpha-value>`, `next-themes` (dark por defecto) y toggle Sol/Luna en la navbar. Cero cambios de clases en componentes.
- Nota: el texto de estadísticas copiado sigue el idioma de la UI; las brand strings ("PresenTimer") no se traducen. PR #17.

### 12. Mando remoto 📋 ⏸️

- Controlar el timer desde el móvil (QR + WebRTC/BroadcastChannel o pequeño servidor).
- **Postergada**: requiere decisión de arquitectura (¿sin servidor con BroadcastChannel?, ¿peerjs?, ¿backend?) que rompería los flujos actuales. Analizar cuando P0/P1 estén estables. Ticket de decisión: #18.
- **Actualización**: el caso «un agente controla el timer» ya está resuelto — ver **14. Control remoto por MCP ✅**. Queda pendiente el caso «móvil como mando» (QR + WebRTC o `BroadcastChannel`), que puede reutilizar el mismo contrato de comandos de `shared/mcp-protocol.js` y la capa `src/mcp/commands.ts` sin tocar el resto de la app.

---

## P3 — Extensibilidad

### 13. Edición masiva de secciones ✅ (sustituida)

> ⚠️ **Sustituida por la spec 13 de P1** (PR #24, issue #22): mismo formato texto `Nombre: 5m`, pero con lápiz junto al `+`, validación estricta con número de línea (`parseSectionsStrict`) e i18n `sections.bulk*`. El diálogo `BulkEditDialog` de esta entrada y sus claves `bulkEdit.*` se eliminan con esa PR; siguen vigentes el `[AI-DECISION]` de descartar JSON y el fix `lastIndexOf(':')` de `parseSections`.

**Problema**: cargar un guion entero (plantilla o preset) es fácil, pero editarlo después obliga a ir sección a sección con el lápiz de cada fila. No hay forma de reescribir todo el guion de golpe.

**Spec** (implementado):
- Botón `ListChecks` (lucide, `ghost h-7 w-7`) a la **izquierda** del `+` de la cabecera de `SectionsList`; solo aparece si hay secciones.
- Abre un `Dialog` con un `Textarea` monoespaciado con **todas las secciones en texto plano**, una por línea con el formato `Nombre: 5m` (también `1h`).
- Vista previa en vivo: «Secciones detectadas: N · Total: hh:mm» o aviso de vacío, con el botón **Aplicar** deshabilitado si no se detecta ninguna sección.
- Aviso explícito de que aplicar vuelve a la primera sección y detiene la cuenta atrás.
- Reutiliza `sectionsToText` (`src/utils/presetUtils.ts`) y `parseSections` (`src/utils/timerUtils.ts`), las mismas funciones que ya usaban el textarea inicial y el import/export de presets.
- i18n ES/EN: grupo `bulkEdit` en `src/i18n/en.ts` (canónico) y `es.ts`.

**[AI-DECISION]** (issue maestro #4): se descartó el formato **JSON** que proponía la PR #20 — obliga a manejar llaves, comillas y `duration` en segundos, justo la fricción que este proyecto evita en su interfaz principal. Se usa el mismo `Nombre: 5m` que el usuario ya escribe al crear el guion, así que la edición masiva no introduce ningún formato nuevo que aprender.

**Corrección de robustez**: `parseSections` partía por el **primer** `:` (`line.split(':')`), así que un nombre con dos puntos —`Demo: parte 2: 5m`— se interpretaba como nombre `"Demo"` y duración `"parte 2"` → `0` → **la sección desaparecía al pulsar Aplicar**. Ahora separa por el **último** `:` (`lastIndexOf`), de modo que el ida y vuelta `sectionsToText → parseSections` es estable para cualquier nombre.

**Criterios de aceptación**:
- [x] El botón de la cabecera abre el editor con las secciones actuales en texto plano.
- [x] Editar y Aplicar reemplaza todas las secciones (timer parado, en la sección 1) y persiste en `localStorage`.
- [x] Un nombre con dos puntos sobrevive al ida y vuelta (cubierto por pruebas y verificado en el navegador).
- [x] Vista previa del recuento y del total en vivo; Aplicar deshabilitado si no hay secciones válidas.
- [x] Textos traducidos ES/EN; `lint`, `typecheck`, `test` y `build` en verde.

**Archivos**: `src/components/BulkEditDialog.tsx`, `src/components/SectionsList.tsx`, `src/utils/timerUtils.ts`, `src/utils/presetUtils.test.ts`, `src/i18n/{en,es}.ts`

**Referencias**: issue #19 (`[P1-13] Edición masiva de secciones`), PR #20 (cerrada: proponía JSON).

---

### 14. Control remoto por MCP ✅

**Problema**: no había forma de que un agente leyera el estado del timer ni de redefinir el guion sin tocar la UI a mano.

**Spec** (implementado):
- Servidor MCP por stdio (`mcp/server.mjs`) que el cliente MCP lanza, más un puente WebSocket en `127.0.0.1`. Efímero: sin cuenta, sin token y sin servicio alojado.
- Contrato compartido y sin dependencias en `shared/mcp-protocol.js`, única fuente de verdad de las 14 herramientas.
- Capa de comandos independiente del transporte en `src/mcp/commands.ts`, con validación previa y errores en español.
- Píldora de estado en la app con la configuración del cliente lista para copiar.
- 67 pruebas unitarias y 23 de aceptación (`npm run test:e2e`).

**[AI-DECISION]** (issue maestro #4): se evaluaron tres opciones — (A) servidor MCP local por stdio + puente de bucle local, (B) MCP remoto alojado en Vercel, (C) WebMCP (`navigator.modelContext`). Se elige **A** porque no requiere cuenta, token, ni servicio alojado, y el estado sigue siendo efímero (vive solo mientras la pestaña está abierta). **B** y **C** quedan documentadas como fases posteriores en [`.planning/`](../.planning/) en lugar de descartarse. Restricción que condiciona todo: una página servida por HTTPS no puede abrir `ws://localhost` (contenido mixto, sin excepción en producción), así que el puente funciona desde `http://localhost` y GitHub Pages sigue siendo el despliegue estático.

**Criterios de aceptación**:
- [x] Un cliente MCP real puede leer el estado y redefinir el guion de una pestaña abierta.
- [x] Los cambios estructurales repintan la UI y persisten en `localStorage`.
- [x] Sin pestaña conectada, las herramientas devuelven un error accionable.
- [x] El bundle de producción no incluye `ws` ni el SDK.

**Archivos**: `shared/mcp-protocol.{js,d.ts}`, `mcp/server.mjs`, `mcp/e2e-driver.mjs`, `src/mcp/*`, `src/components/McpBridgeStatus.tsx`
**Fases posteriores**: MCP remoto en Vercel (fase 02) y WebMCP (fase 03), documentadas en [`.planning/`](../.planning/).

### 15. Cargar presentación desde repositorio GitHub 🚧

- El usuario introduce un repo público (`owner/repo` o URL) que contiene un fichero `presen-timer.json` (mismo formato que el export/import de P1-6; ruta configurable). La app lo descarga vía GitHub Contents API y fusiona sus presets en los locales.
- El repo queda **guardado en localStorage** (`presentation-timer-github-repos`) para volver a él; al reabrir, se **actualiza automáticamente** si el fichero cambió, y hay botón de **update forzado**.
- **Rate limits**: peticiones condicionales con `ETag`/`If-None-Match` (los 304 no consumen cuota de los 60 req/h no autenticados) + throttle de refresco automático (máx. 1 comprobación/repo/10 min, al abrir la app o recuperar visibilidad; sin `setInterval` agresivo). Errores 404/403/429/red tratados con mensajes claros; sin red se usa la caché.
- **Criterios de aceptación**:
  - [ ] Cargar repo público válido → sus presets aparecen y se pueden usar.
  - [ ] Reabrir la app → el repo sigue en la lista, datos cacheados visibles, refresco en segundo plano solo si procede.
  - [ ] Fichero sin cambios → 304, sin consumo de cuota, sin toast de actualización.
  - [ ] Fichero cambiado → presets actualizados + aviso; botón "Actualizar" fuerza la comprobación.
  - [ ] Repo inexistente / sin fichero / rate limit → error visible, estado intacto.
- **Archivos**: `src/utils/githubUtils.ts` (nuevo), `src/hooks/useGitHubRepos.ts` (nuevo), `src/components/GitHubImport.tsx` (nuevo), `src/components/SectionInput.tsx`, `src/i18n/*`.
- Tickets: #21 (núcleo) y #23 (UI + refresco), cerrados por #27. `[AI-DECISION]`: formato JSON propio (descartado YAML: dependencia sin justificar), solo repos públicos en v1 (PAT privado queda futuro).
- **Estado**: implementado en #27 y validado (lint+build+tests en verde, smoke test de la Contents API con ETag/304).

---

## Notas para agentes

- Una feature por PR, título `feat: <feature>` o `fix: <feature>`.
- Toda decisión con opciones → `[AI-DECISION]` en la PR (issue maestro #4).
- Actualizar el estado (📋/🚧/✅) de esta tabla en cada PR que toque una feature.
- Si una feature de P1/P2 requiere análisis profundo, postérgala con ⏸️ y crea ticket.

