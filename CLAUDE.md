# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GSD Pi (formerly GSD-2) is a coding agent CLI. It orchestrates AI coding agents with planning, execution, verification, and shipping workflows. The repo is archived; active development moved to https://github.com/open-gsd/gsd-pi.

## Tech stack

- Node.js >= 22, npm 10.9.3, TypeScript 5.9
- Test runner: Node.js built-in `node:test` with `node:assert/strict`
- Monorepo: npm workspaces (`packages/*`, `extensions/*`)
- Native modules: Rust N-API via `native/` and `@gsd/native`
- Web dashboard: Next.js in `web/`

## Common commands

```bash
# One-time setup
npm ci                              # Install deps and create workspace symlinks
npm run secret-scan:install-hook    # Install pre-commit hooks (run once)

# Build
npm run build                       # Full build (core + web if stale)
npm run build:core                  # Build core only (packages, tsc, copy resources)
npm run build:web-host              # Build Next.js web host
npm run typecheck:extensions        # Typecheck extension TypeScript

# Dev / run
npm run dev                         # Dev CLI entry
npm run gsd                         # Same as dev
npm run gsd:web                     # Dev with web dashboard

# Tests
npm test                            # Full suite: unit + integration + packages
npm run test:unit                   # Compile tests and run unit tests
npm run test:integration            # Integration tests (needs build:core)
npm run test:packages               # Run tests inside workspace packages
npm run test:coverage               # Coverage with c8 thresholds
npm run test:compile                # Compile src/tests to dist-test/
npm run test:unit:compiled          # Run already-compiled unit tests
npm run verify:pr                   # Preflight: build:core + typecheck:extensions + test:unit

# Single test file (using Node test runner directly)
node --import ./src/resources/extensions/gsd/tests/resolve-ts.mjs --experimental-strip-types --test src/tests/<file>.test.ts
```

## High-level architecture

### Entry points

- **`src/loader.ts`** → `dist/loader.js` — Main CLI entry (`gsd` binary). Handles version/help fast-path, Node/git checks, extension discovery, and delegates to `src/cli.ts`.
- **`src/cli.ts`** — Interactive CLI bootstrap. Handles onboarding, worktrees, web mode, and spawns the coding agent.
- **`src/headless.ts`** — `gsd headless` non-interactive orchestrator. Spawns RPC child process, auto-responds to UI requests, streams progress.

### Package layer (`packages/`)

Built in dependency order:

1. `@gsd-build/contracts` — Shared type contracts
2. `@gsd/native` — Rust N-API bindings (grep, AST, git, image, etc.)
3. `@gsd/pi-tui` — Terminal UI components and themes
4. `@gsd/pi-ai` — Unified LLM provider API (Anthropic, OpenAI, Bedrock, Mistral, Google, Ollama)
5. `@gsd/pi-agent-core` — General-purpose agent orchestration core
6. `@gsd/pi-coding-agent` — Main coding agent (RPC client, sessions, resource loading, tool dispatch)
7. `@gsd-build/rpc-client` — RPC client utilities
8. `@gsd-build/mcp-server` — MCP protocol server and project state tools

### Extension system (`src/resources/extensions/`)

Extensions are the primary architecture. Core logic lives in extensions, not the host.

- **Discovery**: `src/extension-discovery.ts` resolves entry points via `package.json` `pi.extensions` array, falling back to `index.ts` / `index.js`.
- **Registry**: `src/extension-registry.ts` loads manifests, controls enable/disable state, enforces load order.
- **Manifest**: `extension-manifest.json` in each extension directory declares `id`, `name`, `version`, `tier`, `requires`, and `provides` (tools, commands, hooks, shortcuts).
- **Tiers**:
  - `core` — Ships with GSD, cannot be disabled (e.g., `gsd` workflow extension)
  - `bundled` — Ships with GSD, can be disabled
  - `community` — User-installed from `~/.gsd/agent/extensions/` or `.gsd/extensions/`

Key bundled extensions:
- `gsd/` — Core workflow engine: auto-mode, milestones, worktrees, decisions, requirements. This is the largest and most complex extension.
- `browser-tools/`, `search-the-web/`, `github-sync/`, `mcp-client/`, `voice/`, `visual-brief/`, `subagent/`, `claude-code-cli/` — Feature extensions
- `shared/` — Shared utilities for extensions

### GSD workflow extension (`src/resources/extensions/gsd/`)

The core `gsd` extension manages the agent workflow:

- **`auto.ts`** / **`auto/`** — Auto-mode orchestration: planning, dispatch, loop, phases, verification, recovery. This is the heart of autonomous agent execution.
- **`gsd-db.ts`** — Single-writer SQLite facade. All writes to `.gsd/gsd.db` must go through this file. `node:sqlite` → `better-sqlite3` → null fallback chain.
- **`workspace.ts`** / **`worktree-*.ts`** — Worktree management and repair.
- **`workflow-mcp.ts`** — MCP tools exposed to the agent (bash, write, read, edit, decisions, requirements).
- **`session-tree.ts`** / **`session-router.ts`** — Session routing and tree management.

### Native layer (`native/`)

Rust workspace compiled to N-API modules. Consumed via `@gsd/native` which re-exports subpaths:
- `grep`, `glob`, `ps`, `clipboard`, `ast`, `html`, `text`, `fd`, `image`, `xxhash`, `diff`, `gsd-parser`, `highlight`, `json-parse`, `stream-process`, `truncate`, `ttsr`

Build: `npm run build:native` or `npm run build:native:dev`

### Web interface (`web/`)

Next.js application providing a browser-based dashboard. Built separately with `npm run build:web-host`. The CLI can spawn it via `gsd --web`.

### Headless mode

`gsd headless` runs without a TUI by spawning the agent in RPC mode and auto-responding to UI prompts. Used for CI and automation. See `src/headless.ts` and `src/headless-events.ts`.

## Test conventions

- **Framework**: `node:test` + `node:assert/strict`. Do not introduce Jest/Vitest.
- **Cleanup**: Use `beforeEach`/`afterEach` for shared fixtures, or `t.after()` for per-test cleanup. Never `try`/`finally` in tests.
- **No source-grep tests**: Tests must execute code, not assert on source text with `readFileSync` + regex. CI enforces this.
- **Fixture data**: Use array join for multi-line fixtures to avoid indentation leakage:
  ```typescript
  const content = ["line1", "line2"].join("\n");
  ```
- **Three recurring defect classes** (enforced by CI):
  1. `Statement#get()` returns `undefined`, not `null` — use `!= null` or `??`
  2. Attach `once()` listeners BEFORE the triggering syscall
  3. `.mjs` importing `.ts` requires `--experimental-strip-types`

## Important file paths

- `src/loader.ts` — CLI entry
- `src/cli.ts` — Interactive bootstrap
- `src/headless.ts` — Headless orchestrator
- `src/extension-discovery.ts`, `src/extension-registry.ts` — Extension system
- `src/resource-loader.ts` — Managed resource loading
- `src/resources/extensions/gsd/auto.ts`, `src/resources/extensions/gsd/auto/` — Auto-mode
- `src/resources/extensions/gsd/gsd-db.ts` — Database single-writer facade
- `packages/pi-coding-agent/` — Main coding agent package
- `packages/pi-ai/` — LLM provider layer
- `native/` — Rust native modules
- `web/` — Next.js web dashboard

## Contributing notes

- Read `VISION.md` and `CONTRIBUTING.md` before making changes.
- Extension-first: if it can be an extension, it should be.
- No premature abstractions. Three similar lines > one abstraction.
- Commit messages must follow Conventional Commits (`feat(scope): description`).
- Branch naming: `<type>/<short-description>` (e.g., `feat/my-feature`).
- Rebase onto `main`, do not merge `main` into feature branches.
- `npm run verify:pr` must pass before pushing.
