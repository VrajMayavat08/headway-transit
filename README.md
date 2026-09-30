# Headway

A real-time and historical transit reliability observatory. This repository currently contains only the frontend application skeleton.

## Development

Use Node.js 22.12+ (Node.js 24 recommended) and npm. From the repository root:

```sh
npm install
npm run dev
```

Vite prints the local application URL. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

```sh
npm run typecheck
npm run build
npm run preview
```

The web app lives in `apps/web`. `/` redirects to `/network`; other workspaces are `/routes`, `/stops`, `/reliability`, `/playback`, and `/alerts`. Production hosting must serve `index.html` for application routes.

See [architecture](docs/architecture.md) and [visual language](docs/visual-language.md).

`data/imports/` is reserved for local GTFS imports; `data/archive/` is reserved for historical archives. Their contents are ignored by Git, except directory placeholders. No data processing is implemented.
