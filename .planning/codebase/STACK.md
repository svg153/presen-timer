# STACK — presen-timer

## Resumen

Aplicación web **100 % cliente**. No hay servidor de aplicación, ni base de datos, ni API propia.
El build produce un conjunto de ficheros estáticos que se sirven desde cualquier hosting.

## Runtime y lenguaje

| Elemento | Versión | Notas |
|----------|---------|-------|
| Node.js | 22 (CI) | `actions/setup-node@v5` en el workflow de Pages |
| TypeScript | ^5.5.3 | `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true` |
| Modo estricto de TS | **desactivado** | `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false` en `tsconfig.app.json` |

## Frontend

| Elemento | Versión | Notas |
|----------|---------|-------|
| Vite | ^5.4.1 | Build y servidor de desarrollo (puerto 8080) |
| React | ^18.3.1 | `react-jsx`, sin compilador propio |
| `@vitejs/plugin-react-swc` | ^3.5.0 | Transformación con SWC |
| react-router-dom | ^6.26.2 | `BrowserRouter` con `basename` derivado de `BASE_URL` |
| Tailwind CSS | ^3.4.11 | Configuración en `tailwind.config.ts` |
| shadcn/ui | — | Componentes copiados en `src/components/ui` (Radix + CVA) |
| lucide-react | ^0.462.0 | Iconografía |
| sonner / Radix Toast | ^1.5.0 / ^1.2.1 | Notificaciones |
| @tanstack/react-query | ^5.56.2 | `QueryClientProvider` montado, sin consultas reales |
| zod | ^3.23.8 | Presente como dependencia, sin uso directo en la app |

## Calidad

| Elemento | Versión | Notas |
|----------|---------|-------|
| ESLint | ^9.9.0 | Configuración plana en `eslint.config.js`, solo para `**/*.{ts,tsx}` |
| typescript-eslint | ^8.0.1 | Reglas recomendadas |
| Prettier | — | **No configurado** |
| Vitest | — | **No instalado** en el punto de partida (se añade en la fase 01) |

## Empaquetado y despliegue

| Elemento | Notas |
|----------|-------|
| Gestores de bloqueo | **Dos**: `package-lock.json` (npm) y `bun.lockb`. La CI usa `npm ci` |
| CI/CD | `.github/workflows/deploy-pages.yml` → GitHub Pages con `build_type: workflow` |
| Base del bundle | `base = process.env.VITE_BASE_PATH ?? "/presen-timer/"` en `vite.config.ts` |

## Dependencias que no se usan

El scaffold arrastra muchas dependencias sin uso real (`recharts`, `embla-carousel-react`,
`input-otp`, `react-day-picker`, `vaul`, `cmdk`, `next-themes`, `@tanstack/react-query`…).
No se eliminan en la fase 01 para no ampliar el alcance.
