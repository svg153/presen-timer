---
name: release
description: Versionar, taggear y verificar el build de producción antes de publicar una release de presen-timer
---

# Release de presen-timer

## 1. Verificación pre-release (obligatoria)

```bash
npm ci            # instalación limpia desde package-lock.json
npm run lint
npm run build     # genera dist/
```

Los tres pasos deben pasar en verde. Si `npm ci` falla, revisa que `package-lock.json` esté sincronizado con `package.json`.

## 2. Versionado

- Usa **versionado semántico**: `MAJOR.MINOR.PATCH`.
  - PATCH: fixes (p. ej. corrección de precisión del timer)
  - MINOR: features nuevas retrocompatibles (p. ej. atajos de teclado)
  - MAJOR: cambios que rompen datos guardados (p. ej. cambio de formato de localStorage)
- Actualiza `"version"` en `package.json` con `npm version <tipo>` (crea el commit y el tag automáticamente).

## 3. Tag y push

```bash
git push --follow-tags
```

## 4. GitHub Release

- Crea la release con `gh release create <tag> --title "vX.Y.Z" --notes "..."`.
- Notas: lista de cambios desde la release anterior (`git log --oneline <tag-anterior>..<tag>`).
- Menciona cualquier `[AI-DECISION]` relevante incluido en la release.

## 5. Post-release

- Verifica que el CI está en verde en `main`.
- Si el despliegue es vía Lovable, los cambios se publican desde `main` automáticamente.

## Checklist

- [ ] `npm ci && npm run lint && npm run build` en verde
- [ ] Versión bump correcta (semver)
- [ ] Tag pusheado con `--follow-tags`
- [ ] GitHub Release con notas
- [ ] CI en verde en `main`
