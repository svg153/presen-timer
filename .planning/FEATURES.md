# FEATURES — presen-timer

Catálogo de funcionalidades. Las columnas indican si la funcionalidad existe ya, si entra en el alcance
de v1 (fase 01) o si queda para después.

---

## Table Stakes

Lo que cualquier temporizador de presentaciones debe tener. **Ya existe.**

| ID | Funcionalidad | Estado | Requisito |
|----|---------------|--------|-----------|
| F-01 | Definir secciones con nombre y duración | Existe | CORE-01 |
| F-02 | Cuenta atrás con inicio y pausa | Existe | CORE-02 |
| F-03 | Avance automático al terminar una sección | Existe | CORE-03 |
| F-04 | Navegación manual entre secciones | Existe | CORE-04 |
| F-05 | Reiniciar la sección actual | Existe | CORE-05 |
| F-06 | Tiempo extra sobre la sección actual | Existe | CORE-06 |
| F-07 | Aviso visual de tiempo restante bajo | Existe | CORE-07 |
| F-08 | Persistencia de las secciones en el navegador | Existe | CORE-08 |

---

## Differentiators

Lo que hace que este proyecto no sea un temporizador más. **Es el alcance de v1.**

| ID | Funcionalidad | Estado | Requisito |
|----|---------------|--------|-----------|
| F-10 | **El agente define la estructura de la charla** desde lenguaje natural | v1 | MCP-02 |
| F-11 | **Control remoto completo del temporizador** (iniciar, pausar, avanzar, retroceder, saltar) | v1 | MCP-06…MCP-12 |
| F-12 | **Lectura del estado en vivo** para que el agente sepa por dónde va | v1 | MCP-13 |
| F-13 | **Edición incremental** de la estructura: añadir, modificar y borrar una sola sección | v1 | MCP-03…MCP-05 |
| F-14 | **Cero configuración**: sin cuentas, sin tokens, sin nube | v1 | BRG-03 |
| F-15 | **Conciencia del contexto**: la interfaz explica la limitación de HTTPS en vez de fallar en silencio | v1 | UI-03 |
| F-16 | **Un solo origen de verdad**: el mismo comando sirve para stdio hoy y HTTP mañana | v1 | BRG-01 |

### Por qué importan

`F-10` y `F-11` son el motivo del proyecto: hoy, preparar la charla exige teclear cada sección a mano, y
durante la charla hay que volver al portátil para tocar el temporizador. Con MCP, el agente prepara la
estructura y puede gobernar el ritmo desde el propio chat.

`F-14` es deliberado: la alternativa (servidor remoto con token de emparejamiento) habría obligado al
usuario a registrarse en un servicio y a gestionar credenciales para cronometrar una charla.

---

## Anti-Features

Cosas que **deliberadamente no** se hacen, con el motivo.

| Anti-feature | Motivo |
|--------------|--------|
| Controlar la pantalla completa desde el agente | `requestFullscreen()` exige gesto de usuario; una herramienta que siempre falla es peor que no tenerla |
| Endpoint MCP público sin autenticación | Cualquiera podría mover el temporizador de cualquiera |
| Ejecutar el temporizador en un servidor | El tiempo debe correr en el navegador del presentador, no en la nube |
| Sustituir GitHub Pages por otra plataforma | La web pública es una demo que funciona y no cuesta nada; se queda como está |
| Depender de WebMCP para el control remoto | Solo lo soporta Chrome y solo lo invoca su agente integrado |
| Almacenar el estado de la charla en la nube en v1 | No hace falta para nada del alcance de v1 y añade privacidad y coste |
| Añadir telemetría | Un repositorio público de un POC no debe enviar datos a ningún sitio |

---

## Grafo de dependencias

```
F-01 … F-08  (temporizador existente)
      │
      ▼
   F-16  un solo origen de verdad (protocolo compartido)
      │
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
    F-14          F-12           F-10  definir estructura
  cero config   leer estado        │
      │              │             ▼
      ▼              ▼        F-13  edición incremental
   F-11  control remoto  ◄──────────┘
      │
      ▼
   F-15  conciencia del contexto (UI)
```

Todas las funcionalidades de v1 dependen de `F-16`: si el protocolo no está compartido entre el
servidor y el navegador, el resto se construye sobre arena.

---

## Funcionalidades de fases posteriores

| ID | Funcionalidad | Fase | Requisito |
|----|---------------|------|-----------|
| F-20 | Endpoint MCP remoto por HTTPS | 02 | RMCP-01 |
| F-21 | Emparejamiento de sesión con token efímero | 02 | RMCP-02 |
| F-22 | Estado compartido para relacionar token y pestaña | 02 | RMCP-03 |
| F-23 | Despliegue del conjunto en Vercel | 02 | RMCP-05 |
| F-24 | Herramientas registradas vía WebMCP | 03 | WMCP-01 |
| F-25 | Detección de capacidad y degradación elegante | 03 | WMCP-02 |
| F-26 | Aviso sonoro real (fichero de audio válido) | 04 | — |
| F-27 | Reducer puro y pruebas del bucle de cuenta atrás | 04 | — |
