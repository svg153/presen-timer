# CONVENTIONS — presen-timer

## Idioma

- **Código, nombres de variables, comentarios y UI:** inglés.
- **Documentación de planificación (`.planning/`):** español.
- El README está en inglés, igual que el código.

## TypeScript

- Alias `@/*` → `./src/*` (definido en `tsconfig.app.json` y en `vite.config.ts`).
- Importaciones siempre con el alias, nunca con rutas relativas largas:
  `import { Button } from '@/components/ui/button'`.
- `strict` está desactivado; los tipos son laxos por herencia del scaffold. **El código nuevo debe
  tiparse bien igualmente** (no aprovecharse de `any` implícito).
- Interfaces locales para las props de cada componente, declaradas justo encima del componente.

## Componentes

```tsx
interface FooProps {
  onBar: () => void;
}

const Foo = ({ onBar }: FooProps) => {
  return <div />;
};

export default Foo;
```

- Exportación **por defecto** en componentes y páginas.
- Exportación **con nombre** en utilidades y hooks auxiliares (`timerUtils.ts`).
- Clases de Tailwind en línea, con los tokens del tema (`text-github-light`, `bg-github-dark`,
  `glass-card`, `animate-fade-in`…). No hay CSS Modules ni styled-components.
- Los componentes nuevos deben seguir el aspecto visual existente (tema oscuro, acento morado).

## Estado y hooks

- Un solo hook de dominio (`useTimer`) que devuelve **estado + callbacks**.
- Los callbacks se memorizan con `useCallback` y las actualizaciones usan la forma funcional
  `setState(prev => …)` para no depender de valores capturados.
- Efectos secundarios (audio, intervalos) encapsulados en `useEffect` con limpieza.

## Pruebas (a partir de la fase 01)

- Vitest, sin `describe` anidado innecesario.
- Un fichero de prueba junto al módulo (`timerUtils.test.ts` junto a `timerUtils.ts`).
- Se prioriza probar **lógica pura**: parseo, formateo, cálculo de progreso y mapeo de comandos.

## Git

- Mensajes en inglés, en imperativo.
- Un commit por unidad coherente de trabajo.
- El pie de commit incluye `Co-authored-by` del agente.

## ESLint

`eslint.config.js` (formato plano) aplica a `**/*.{ts,tsx}` con:
- `js.configs.recommended` + `typescript-eslint` recomendado,
- `react-hooks` recomendado,
- `react-refresh/only-export-components` como aviso,
- `@typescript-eslint/no-unused-vars` **desactivado**.

`npm run lint` parte de **0 errores y 6 avisos**, todos en el scaffold de shadcn
(`src/components/ui/*.tsx`). La fase 01 no añade ninguno.

## Formateo

No hay Prettier configurado. El estilo vigente: comillas simples, punto y coma, 2 espacios de sangrado.
