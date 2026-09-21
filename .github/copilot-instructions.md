# Copilot instructions

**Lee primero [`AGENTS.md`](../AGENTS.md) en la raíz del repositorio** — es la fuente única de verdad para este proyecto (stack, arquitectura, convenciones y reglas).

## Notas específicas de Copilot

- **Skills disponibles** (se cargan bajo demanda):
  - `.github/skills/timer-feature/` — flujo completo para añadir una feature al timer
  - `.github/skills/release/` — versionar, taggear y verificar build
- **Agente personalizado**: `.github/agents/presen-timer-dev.agent.md` — úsalo para tareas de desarrollo en este repo.
- **Roadmap**: `docs/ROADMAP.md` — features priorizadas con specs accionables.
- **Decisiones autónomas**: si tienes que elegir entre opciones con impacto arquitectónico, documenta la decisión con el marcador `[AI-DECISION]` (pregunta, opciones, investigación, decisión final) en el issue/PR y continúa con la opción recomendada. Issue maestro: #4.
- **Validación**: `npm run lint && npm run build` antes de terminar cualquier cambio.
