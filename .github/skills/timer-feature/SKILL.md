---
name: timer-feature
description: Flujo completo para añadir una nueva funcionalidad al temporizador de presentaciones (estado, lógica, UI y validación)
---

# Añadir una feature al timer

Flujo estándar para implementar cualquier feature nueva en presen-timer. Sigue las capas en orden: **lógica → estado → UI → estilos → validación**.

## 1. Lógica pura (si aplica) — `src/utils/timerUtils.ts`

Añade funciones puras (sin React, sin efectos). Deben ser testeables y reutilizables.

```ts
// Ejemplo: cálculo de tiempo extra acumulado
export const calculateOvertime = (duration: number, elapsed: number): number =>
  Math.max(0, elapsed - duration);
```

## 2. Estado — `src/hooks/useTimer.ts`

- Añade el estado/campos necesarios a `TimerState`.
- Expón un `useCallback` por acción nueva en el return del hook.
- **Nunca** dupliques estado del timer en componentes.
- Si la feature persiste datos, usa helpers de `timerUtils.ts` (patrón `saveToLocalStorage`/`loadFromLocalStorage` con su propia `STORAGE_KEY`).

## 3. UI — `src/components/`

- Crea o modifica componentes **presentacionales**: reciben props de `Index.tsx`, no llaman a `useTimer` directamente.
- Conecta en `src/pages/Index.tsx` (único orquestador).
- Reutiliza componentes de `src/components/ui/` (shadcn) — **no los edites**.
- Iconos: `lucide-react`. Toasts: `sonner` vía `toast()` de `@/hooks/use-toast`.

## 4. Estilos

- Clases Tailwind con los tokens del proyecto (`github-light`, `github-purple`, `glass-card`, `animate-fade-in`...).
- Colores nuevos → definirlos en `tailwind.config.ts`, no hardcodear hex.

## 5. Validación (obligatoria)

```bash
npm run lint && npm run build
```

Si falla el lint, corrige; no desactives reglas. Si el build falla por TypeScript, corrige los tipos — no uses `any`.

## 6. Documentación

- Si la feature cambia el flujo de datos o añade estado relevante, actualiza el mapa de arquitectura de `AGENTS.md`.
- Si tomaste decisiones con opciones (p. ej. dónde vive el estado), documenta con `[AI-DECISION]` en la PR (ver issue #4).

## Checklist final

- [ ] Lógica pura en `timerUtils.ts`
- [ ] Estado solo en `useTimer`
- [ ] Componentes presentacionales conectados vía `Index.tsx`
- [ ] Tokens de Tailwind, sin hex hardcodeados
- [ ] `npm run lint && npm run build` en verde
- [ ] `[AI-DECISION]` documentado si hubo opciones
