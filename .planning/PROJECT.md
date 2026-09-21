# PROJECT — presen-timer

## What This Is

`presen-timer` es un **temporizador de presentaciones** que se ejecuta íntegramente en el navegador.
El ponente define una lista de secciones con su duración (`Introducción: 3m`, `Demo: 10m`, …) y la app
muestra una cuenta atrás por sección, avanza sola al terminar cada una, avisa cuando quedan 30 segundos
y lleva un progreso global de la charla.

Nació como **prueba de concepto** para una conferencia en Málaga y ahora es un proyecto público,
desplegado como sitio estático.

- Repositorio: <https://github.com/svg153/presen-timer>
- Demo en vivo: <https://svg153.github.io/presen-timer/>

## Core Value

Que un ponente pueda ver, de un vistazo y sin pensar, **cuánto tiempo le queda en la sección actual y en
la charla completa**, sin depender de ninguna cuenta, servidor ni conexión.

## Requirements

### Validated

Inferidos del código existente (proyecto brownfield: la funcionalidad ya construida es requisito
validado, no propuesta).

- **CORE-01** — Definir secciones escribiendo `Nombre: duración` una por línea.
- **CORE-02** — Cuenta atrás por sección con avance automático a la siguiente.
- **CORE-03** — Aviso visual cuando quedan ≤ 30 segundos de la sección.
- **CORE-04** — Controles: play/pausa, reiniciar sección, siguiente, anterior, salto directo, tiempo extra, finalizar.
- **CORE-05** — Las secciones se conservan entre recargas (`localStorage`, clave `presentation-timer-sections`).
- **CORE-06** — Barra de progreso global y por sección.
- **CORE-07** — Pantalla completa y panel lateral de secciones.
- **CORE-08** — Despliegue estático en GitHub Pages bajo el subdirectorio `/presen-timer/`.

### Active

- **MCP-01 … MCP-13** — Servidor MCP local que permite a un agente controlar el temporizador y reescribir
  la estructura de secciones. Ver `.planning/REQUIREMENTS.md`.
- **BRG-01 … BRG-05** — Puente efímero navegador ↔ servidor MCP.
- **UI-01 … UI-02** — Estado del puente y ayuda de configuración en la interfaz.
- **SEC-01 … SEC-03** — Solo loopback, sin tokens, sin secretos.
- **DOC-01 … DOC-03** — Artefactos GSD, investigación y README.
- **TST-01 … TST-04** — Pruebas unitarias y verificación end-to-end.

### Out of Scope

- **Backend permanente.** La app sigue siendo estática y funciona sin red.
- **Control remoto desde fuera de la máquina local en la v1.** Requiere un servidor alojado (fase 02).
- **Pantalla completa por control remoto.** `requestFullscreen()` exige un gesto de usuario y no se puede
  disparar desde un agente.
- **Autenticación en la v1.** Innecesaria mientras el puente escuche solo en `127.0.0.1`.
- **WebMCP como sustituto de MCP.** Solo lo invoca el agente integrado del navegador, no Claude Code ni Copilot.

## Context

- **Origen:** prueba de concepto de 2025, generada con Lovable (`gpt-engineer-app[bot]` como único autor).
  Se usó en una conferencia en Málaga.
- **Estado:** repositorio **público**, sin secretos ni PII (auditado árbol de trabajo e historial completo).
- **Antigüedad:** ~1 año. Las dependencias acumulan 55 avisos de Dependabot (24 altos, 27 moderados, 4 bajos).
- **Equipo:** un solo mantenedor (svg153).
- **Idioma del código y de los artefactos:** inglés en el código, español en los documentos de planificación.

## Constraints

- **Sin backend.** Todo el estado vive en la pestaña del navegador.
- **GitHub Pages debe seguir funcionando igual.** Es un sitio estático servido bajo `/presen-timer/`.
- **Una página HTTPS no puede abrir `ws://localhost`.** Es contenido mixto bloqueado por el navegador,
  sin excepción fiable. El control remoto local solo funciona sirviendo la app desde `http://localhost`.
- **El navegador no puede ser servidor MCP.** MCP es un protocolo cliente ↔ servidor; la pestaña es
  siempre la parte controlada.
- **Sin framework de pruebas** en el punto de partida.
- **`public/notification.mp3` es un placeholder de texto** (149 bytes): el aviso sonoro falla en silencio.

## Key Decisions

| ID | Decisión | Motivo |
|----|----------|--------|
| D-01 | El servidor MCP se ejecuta **localmente** por `stdio`, lanzado por el cliente MCP | Es el transporte estándar para integraciones locales; sin proceso permanente ni servicio que mantener |
| D-02 | El puente navegador ↔ servidor usa **WebSocket en `127.0.0.1`** | Un canal bidireccional es lo natural para control en vivo; en loopback no hay exposición pública y por tanto **no hacen falta tokens** |
| D-03 | **Sin autenticación en la v1** | El puerto está ligado a loopback; añadir tokens solo añadiría fricción sin mejorar la seguridad |
| D-04 | GitHub Pages **se queda como demo estática**, sin control remoto | No puede alojar un servidor y una página HTTPS no puede hablar con `ws://localhost` |
| D-05 | El MCP remoto alojado (Vercel + Upstash Redis) se **documenta como fase 02**, no se implementa | El usuario priorizó una solución efímera, sin cloud ni coste, para empezar |
| D-06 | **WebMCP se documenta como fase 03** | Es la vía correcta para el agente del navegador, pero no lo invocan Claude Code ni Copilot y solo existe en Chrome |
| D-07 | Los artefactos GSD se **escriben a mano** conforme a las plantillas oficiales | El instalador añadiría `.claude/` (72 skills), `.github/copilot-instructions.md` y hooks a un repositorio público |
| D-08 | La **capa de comandos** se diseña independiente del transporte | La fase 02 reutilizará exactamente la misma superficie de herramientas sobre HTTP |
| D-09 | No se expone `timer_toggle_fullscreen` | La API de pantalla completa exige un gesto de usuario; una herramienta que siempre falla es peor que no tenerla |
