# Too Many Lists

Scaffolded with [`create-sveltekitbook`](https://github.com/AndyGauge/create-sveltekitbook).

## Dev

```sh
npm install
npm run dev
```

## Content

`src/lib/outline.js` is the book. Each entry is one page.

`src/lib/config.js` holds title, author, and Giscus ids.

Routes under `src/routes/` are yours — edit freely.

## Deploy (GitHub Pages)

Push to the GitHub repo in `svelte.config.js` (paths.base) and configure
Pages to serve from the `gh-pages` branch or GitHub Actions — any static
deploy works since this is prerendered via `@sveltejs/adapter-static`.
