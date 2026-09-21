# PresenTimer

A minimalist presentation timer with section management, built as a proof of concept for a talk.

Define your agenda as `Section: duration` lines, then run the timer with a progress bar,
per-section countdown, a 30-second warning state, extra-time buttons and fullscreen mode.

## Tech stack

- Vite
- TypeScript
- React
- shadcn-ui + Radix UI
- Tailwind CSS

Everything runs client-side: sections are kept in `localStorage` and nothing is sent to a server.

## Getting started

```sh
npm install
npm run dev
```

The dev server listens on http://localhost:8080/presen-timer/.

## Build

```sh
npm run build     # production bundle in dist/
npm run preview   # serve the built bundle locally
npm run lint      # eslint
```

### Base path

`vite.config.ts` defaults to a base path of `/presen-timer/`, which matches the GitHub Pages
project site at `https://svg153.github.io/presen-timer/`. Override it when hosting elsewhere:

```sh
VITE_BASE_PATH=/ npm run build          # custom domain or user/org page
VITE_BASE_PATH=/some-path/ npm run build
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy-pages.yml`, which builds the site and publishes
it to GitHub Pages. The workflow derives the base path from the repository name and copies
`index.html` to `404.html` so client-side routes resolve correctly.

One-time setup: in the repository settings, set **Pages → Build and deployment → Source** to
**GitHub Actions**.

## Notes

- `public/notification.mp3` is still a placeholder text file from the original scaffold, so the
  end-of-section chime does not play. The app handles the failure silently. Drop a real MP3 with
  that name into `public/` to enable it.
- The `lovable-tagger` dev dependency only activates during `npm run dev`.
