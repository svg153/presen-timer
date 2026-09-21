# presen-timer ⏱️

Temporizador para presentaciones con secciones cronometradas: define las secciones de tu charla (`Introducción: 5m`, `Demo: 10m`...), y el timer avanza automáticamente con avisos sonoros y visuales para que no pierdas el hilo ni el tiempo.

## ✨ Funcionalidades

- **Secciones cronometradas**: define una por línea con formato `Nombre: 5m` (minutos) o `2h` (horas)
- **Avance automático** entre secciones con notificación sonora
- **Aviso visual** a 30 segundos del final de cada sección
- **Barra de progreso** global de la presentación
- **Sidebar** con la lista de secciones y navegación directa
- **Tiempo extra**: añade minutos sobre la marcha
- **Pantalla completa** para proyectar
- **Persistencia**: tus secciones se guardan en el navegador

## 🚀 Uso

```bash
npm install
npm run dev
```

Abre `http://localhost:8080`, escribe tus secciones y pulsa **Create Timer**.

## 🛠️ Stack

Vite 5 · React 18 · TypeScript · shadcn/ui · Tailwind CSS 3

## 🤖 Desarrollo con agentes IA

Este repositorio está preparado para desarrollo asistido por agentes:

- **[`AGENTS.md`](AGENTS.md)** — guía para agentes: stack, arquitectura, convenciones y reglas
- **[`docs/ROADMAP.md`](docs/ROADMAP.md)** — roadmap de features priorizado con specs accionables
- **Skills** (`.github/skills/`) — flujos reutilizables: `timer-feature`, `release`
- **Agente personalizado** (`.github/agents/`) — `presen-timer-dev` para Copilot
- **Decisiones IA** — issue #4, marcador `[AI-DECISION]`

## 📄 Licencia

MIT
