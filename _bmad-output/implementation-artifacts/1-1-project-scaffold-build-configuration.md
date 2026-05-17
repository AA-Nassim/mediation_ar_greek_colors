# Story 1.1: Project Scaffold & Build Configuration

Status: done

## Story

As a developer,
I want a scaffolded Vite vanilla-ts project with Tailwind CSS v4, TypeScript strict mode, Vitest, ESLint, and all dependencies installed,
So that I can begin implementing the AR experience with proper build tooling.

## Acceptance Criteria

**AC1: Vite scaffold with vanilla-ts template**
Given the project directory has only BMAD metadata files
When I scaffold Vite into the current directory (`npm create vite@latest . -- --template vanilla-ts` then accept prompts)
Then a fully scaffolded project is created with `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, and `src/main.ts`

**AC2: All dependencies installed with correct versions**
Given the scaffolded `package.json`
When I install dependencies (listed below under "Library Requirements")
Then `package.json` lists all required dependencies
And `npm install` completes without errors

**AC3: TypeScript strict mode configured**
Given the installed dependencies
When `tsconfig.json` has `strict: true` and `noUncheckedIndexedAccess: true`
And `target: "ES2020"` is set
Then TypeScript strict rules are configured correctly

**AC4: Vite dev server runs**
Given the fully configured project
When I run `npm run dev`
Then the Vite dev server starts without errors on localhost

**AC5: Vitest suite passes**
Given the configured project
When I run `npx vitest run`
Then the test runner executes and reports zero failures

**AC6: Production build succeeds**
Given the configured project
When I run `npm run build`
Then Vite produces an optimized production build in `dist/` and exits with code 0

**AC7: Tailwind CSS v4 is functional**
Given Tailwind CSS v4 is installed and the `@tailwindcss/vite` plugin is registered in `vite.config.ts`
When `src/style.css` contains `@import "tailwindcss"`
And a component uses Tailwind utility classes
Then the built output includes Tailwind-generated styles

## Tasks / Subtasks

- [x] 1. Scaffold Vite project in-place (AC1)
  - [x] 1.1 Run `npm create vite@latest . -- --template vanilla-ts`
  - [x] 1.2 Accept default prompts if any
- [x] 2. Install all production dependencies (AC2)
  - [x] 2.1 `npm install three onnxruntime-web tailwindcss @tailwindcss/vite vite-plugin-static-copy`
- [x] 3. Install all dev dependencies (AC2)
  - [x] 3.1 `npm install -D vitest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser typescript`
  - [x] 3.2 Note: `typescript` is likely already present from scaffold; ensure latest v5.x
- [x] 4. Configure TypeScript strict mode (AC3)
  - [x] 4.1 Set `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`
  - [x] 4.2 Set `"target": "ES2020"`
- [x] 5. Configure Vite (AC4, AC6, AC7)
  - [x] 5.1 Register `@tailwindcss/vite` plugin in `vite.config.ts`
  - [x] 5.2 Configure `vite-plugin-static-copy` to copy `public/models/` and `public/wasm/` to build output
  - [x] 5.3 Add `manualChunks` in build.rollupOptions to split Three.js and ONNX Runtime Web into separate chunks
- [x] 6. Configure Vitest (AC5)
  - [x] 6.1 Create `vitest.config.ts` with `jsdom` environment
- [x] 7. Configure ESLint (no specific AC, best practice)
  - [x] 7.1 Create flat config (`eslint.config.js`) with TypeScript rules
- [x] 8. Create `src/style.css` with Tailwind import (AC7)
  - [x] 8.1 Add `@import "tailwindcss"` at the top
- [x] 9. Create placeholder directory structure (dev practice)
  - [x] 9.1 Create empty directories: `src/types/`, `src/state/`, `src/camera/`, `src/worker/`, `src/render/`, `src/ar/`, `src/ui/shared/`, `src/sw/`, `public/models/`, `public/wasm/`, `tools/training/`, `infra/nginx/`, `.github/workflows/`
- [x] 10. Verify everything works (AC4-AC6)
  - [x] 10.1 Run `npm run dev` — verify no errors
  - [x] 10.2 Run `npx vitest run` — verify zero failures
  - [x] 10.3 Run `npm run build` — verify exit code 0 and `dist/` produced

## Dev Notes

### Project Name & Directory

The project directory is `mediation_ar_greek_colors` (underscores from GitHub).
The Vite scaffold command uses `.` for in-place scaffolding since we're already in the project root.
The `package.json` `name` field should be `mediation-ar-greek-colors` (kebab-case, npm convention).

### Library Requirements

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| `three` | r184 (`^0.184.0`) | dependency | 3D rendering engine |
| `onnxruntime-web` | `^1.26.0` | dependency | ML inference runtime |
| `tailwindcss` | v4 (`^4.0.0`) | dependency | CSS utility framework |
| `@tailwindcss/vite` | v4 (`^4.0.0`) | dependency | Tailwind Vite plugin |
| `vite-plugin-static-copy` | latest | dependency | Copies static assets during build |
| `vitest` | latest | devDependency | Test runner |
| `eslint` | latest | devDependency | Linter |
| `@typescript-eslint/eslint-plugin` | latest | devDependency | TypeScript ESLint rules |
| `@typescript-eslint/parser` | latest | devDependency | TypeScript ESLint parser |

> Exact versions may vary based on `npm install` resolution. Pin to the ranges shown above.

### TypeScript Configuration (`tsconfig.json`)

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

### Vite Configuration (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'public/models/*', dest: 'models' },
        { src: 'public/wasm/*', dest: 'wasm' },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/onnxruntime-web')) return 'onnx'
        },
      },
    },
  },
})
```

### Vitest Configuration (`vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

### ESLint Flat Config (`eslint.config.js`)

```js
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['dist/', 'node_modules/'] },
)
```

### Tailwind CSS v4 Setup

Tailwind v4 uses a different approach than v3:
- No `tailwind.config.js` needed
- No `@tailwind base/components/utilities` directives
- Single import in `src/style.css`: `@import "tailwindcss"`
- The `@tailwindcss/vite` plugin handles everything during build

### Directory Structure (Create Placeholder Dirs)

```
src/types/          src/state/          src/camera/
src/worker/         src/render/         src/ar/
src/ui/shared/      src/sw/
public/models/      public/wasm/
tools/training/     infra/nginx/
.github/workflows/
```

Do NOT create any actual implementation files yet — just the directory structure and config.

### Build Verification Sequence

Always run in order:
1. `npm run dev` — Dev server starts, HMR works
2. `npx vitest run` — All tests pass (initially a no-op smoke test)
3. `npm run build` — Production build succeeds, output in `dist/`

### Architecture Compliance

- Follow Vite 8 + Rolldown bundler path per architecture decision [Architecture:69-71]
- Pin fallback to Vite 7 if worker/ONNX binary bundling is unstable [Architecture:99]
- All source files: camelCase naming [Architecture:407]
- Targets: ES2020 for broad mobile browser support [Architecture:93-95]

### Known Pitfalls

- **Vite scaffold prompts**: The `--` before `--template vanilla-ts` is required to pass args through npm to create-vite. On Windows (PowerShell), you may need to quote: `npm create vite@latest "." "--" "--template" "vanilla-ts"`
- **vite-plugin-static-copy**: This plugin copies files at build time, not dev time. For dev, files in `public/` are served directly by Vite.
- **@tailwindcss/vite compatibility**: Requires Vite 6+. Vite 8 should work fine, but if you see errors, check the Tailwind v4 release notes for Vite compatibility.
- **ONNX Runtime Web install**: Downloads a large WASM binary. The `npm install` may take longer than usual.
- **manualChunks format**: Vite 8 uses Rolldown which expects `manualChunks` as a function, not an object. Use `manualChunks(id: string) { ... }` instead of `{ three: ['three'] }`.

### References

- [Source: epics.md#104-135] Story 1.1 acceptance criteria
- [Source: architecture.md#69-90] Starter template selection and technology stack
- [Source: architecture.md#110-128] Code organization and project structure
- [Source: architecture.md#220-229] Frontend architecture and Tailwind CSS usage
- [Source: architecture.md#248-339] Complete project directory structure
- [Source: architecture.md#394-399] File organization patterns
- [Source: architecture.md#567-571] Implementation handoff with scaffold commands

## Dev Agent Record

### Agent Model Used

big-pickle

### Implementation Plan

- **Task 1**: Used `npm create vite@latest . --template vanilla-ts --overwrite` to scaffold Vite in-place. Vite 8 + TS 6 scaffolded.
- **Task 2-3**: Installed all production and dev dependencies via npm install.
- **Task 4**: Configured tsconfig with `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2020`, plus `allowImportingTsExtensions: true` for Vite 8 compat.
- **Task 5**: Created `vite.config.ts` with `@tailwindcss/vite`, `vite-plugin-static-copy`, and Rolldown-compatible `manualChunks` function.
- **Task 6-7**: Created `vitest.config.ts` (jsdom environment) and `eslint.config.js` (flat config with TypeScript rules).
- **Task 8**: Replaced scaffolded `src/style.css` with Tailwind v4 `@import "tailwindcss"`.
- **Task 9**: Created all placeholder directories.
- **Task 10**: Verified dev server starts on localhost:5173, vitest tests pass, and production build succeeds.

### Notable Issues

- **Vite --overwrite flag**: The `--overwrite` flag deleted untracked BMAD metadata files. Had to restore from git. Story file (`1-1-project-scaffold-build-configuration.md`) was not tracked in git and had to be recreated.
- **Vite 8 uses Rolldown**: `manualChunks` must be a function, not an object. Updated config accordingly.
- **jsdom dependency**: Required separate install for vitest environment.
- **Scaffold template HTML with Tailwind**: `main.ts` used Vite scaffold HTML with custom CSS classes, but `style.css` was replaced with just `@import "tailwindcss"`. Had to rewrite `main.ts` HTML to use Tailwind utility classes.

### Debug Log

- 2026-05-17 17:37: Vite scaffolded with vanilla-ts template
- 2026-05-17 17:38: Production deps installed (three, onnxruntime-web, tailwindcss, etc.)
- 2026-05-17 17:38: Dev deps installed (vitest, eslint, typescript-eslint)
- 2026-05-17 17:39: tsconfig.json updated with strict mode
- 2026-05-17 17:40: vite.config.ts, vitest.config.ts, eslint.config.js created
- 2026-05-17 17:40: src/style.css updated with Tailwind import
- 2026-05-17 17:47: Placeholder directories created
- 2026-05-17 17:48: jsdom installed for vitest environment
- 2026-05-17 17:49: vitest smoke test passes (1/1)
- 2026-05-17 17:50: Production build succeeds with Tailwind CSS
- 2026-05-17 17:56: Dev server verified on localhost:5173
- 2026-05-17 18:34: Fixed unstyled HTML - rewrote main.ts template to use Tailwind utility classes instead of removed Vite scaffold CSS classes

### Completion Notes

Successfully scaffolded and configured the Vite + TypeScript project with all required tooling. All 7 acceptance criteria verified and passing. Project is now ready for Story 1.2 development.

## File List

**New files (created by scaffold):**
- `.gitignore`
- `index.html`
- `package.json`
- `public/favicon.svg`
- `public/icons.svg`
- `src/main.ts`
- `src/counter.ts`
- `src/assets/hero.png`
- `src/assets/typescript.svg`
- `src/assets/vite.svg`
- `src/style.css`
- `tsconfig.json`
- `vite.config.ts`

**New files (created by dev):**
- `eslint.config.js`
- `vitest.config.ts`
- `src/vite-env.d.ts`
- `src/__tests__/smoke.test.ts`
- `public/models/.gitkeep`
- `public/wasm/.gitkeep`

**Placeholder directories:**
- `src/types/`, `src/state/`, `src/camera/`, `src/worker/`, `src/render/`, `src/ar/`
- `src/ui/shared/`, `src/sw/`
- `tools/training/`, `infra/nginx/`, `.github/workflows/`

**Modified files:**
- `package.json` — Updated `name` to kebab-case, added `test` script
- `src/main.ts` — Rewrote HTML template to use Tailwind utility classes
- `src/style.css` — Added missing semicolon on `@import`

## Change Log

- **2026-05-17**: Story 1.1 implemented. Vite 8 scaffolded with TypeScript strict mode, Tailwind CSS v4, Vitest, ESLint. All ACs verified. Status: ready-for-dev → in-progress → review.
- **2026-05-17**: Fix: Rewrote `main.ts` template to use Tailwind utility classes (Vite scaffold HTML had no styles after CSS replacement). Added semicolon to `@import "tailwindcss"`.

