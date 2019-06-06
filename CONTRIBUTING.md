# CONTRIBUTING

Pull requests are welcome.

## Development

### Dev: Prerequisites

- NodeJS (>= 8.9)
- Yarn (>= 1.9)

```sh
# Once at first.
yarn
```

- Create `.env` file for your environment and twitter account settings. See `.env-sample` as example.

### Dev: Build Commands

```sh
# Keep build process running.
yarn run dev

# Build for production use.
yarn run prod
```

### Dev: Directory Structure

- `.env` and config files.
- `package.json`
- `src/`
    TypeScript source codes.
- `src/client/`
    Client-side SPA app. Uses React.
- `src/server/`
    Server-side web server app. Uses Express.
- `dist/`
    Contains build results and static files to be served.
- `dist/public/`
    Static files to be served. html docs, stylesheets, scripts, images, etc.
- `dist/server/`
    Server app.
- *dist/client/*
    Ignore this.

### Dev: Notes on TypeScript and Build Process

We use **TypeScript** for both server/client apps.
Config files for server/client apps are *same*.
Sharing config files (tsconfig and tslint) for them seems to simplify build process.

Build tools for server/client apps are *different*.

- To build the client app, **Webpack** bundles scripts into single file `/dist/public/scripts/bundle.js`.
- To build the server app, **tsc** (TypeScript Compiler) converts multiple typescript files to multiple javascript files.
