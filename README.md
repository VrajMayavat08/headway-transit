# Headway

A real-time and historical Toronto TTC reliability observatory. The workspace includes a React frontend, Fastify API, local PostgreSQL/PostGIS foundation, static GTFS schedule import, bounded vehicle observations, historical snapshots, observed-headway bounds, and official TTC service-alert retrieval.

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

See [architecture](docs/architecture.md), [local integration](docs/local-integration.md), and [visual language](docs/visual-language.md).

For production preparation, run database migrations separately from the API process. The frontend uses same-origin `/api` by default; configure `VITE_API_BASE_URL` during the frontend build only when the API is hosted on a separate origin. See the deployment configuration section in [local integration](docs/local-integration.md).

See [deployment preparation](docs/deployment.md) for the required environment and provider-neutral release procedure.

`data/imports/` is reserved for local GTFS imports; `data/archive/` is reserved for historical archives. Their contents are ignored by Git, except directory placeholders.
