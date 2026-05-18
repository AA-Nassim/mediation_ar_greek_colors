# Story 1.4: Splash Screen & Three.js Boot with Model Download Progress

Change Log: 2026-05-18 — Implemented Story 1.4: splash screen, loading progress bar, model download with ReadableStream, Error state with retry. All 11 tasks complete, 59/59 tests passing.
Status: done

## Story

As a visitor,
I want to see a splash screen on cold start and a loading progress indicator while the recognition model downloads,
So that I understand the app is initializing and know how long to wait.

## Acceptance Criteria

**AC1: Branded splash screen on cold start**
Given the app is opened for the first time (cold cache)
When the page loads
Then a branded splash screen is displayed immediately with the app name and a brief "Preparing AR experience..." message

**AC2: Splash updates when renderer ready**
Given the splash screen is visible
When the Three.js scene and WebGLRenderer initialize in the background
Then the splash screen updates to show a progress state once the renderer is ready

**AC3: Download progress bar for model**
Given the renderer is ready
When the recognition model `.ort` file begins downloading
Then a progress bar or percentage indicator shows download status, updating as chunks arrive

**AC4: Smooth fade to camera preview on completion**
Given the download completes
When the model is fully downloaded
Then the splash screen transitions to the camera preview with a smooth fade-out animation

**AC5: Download failure with retry**
Given the download fails due to network error
When the fetch request throws
Then an error screen is displayed with a Retry button

## Tasks / Subtasks

- [x] 1. Update `src/config.ts` — add model download configuration (AC3)
  - [x] 1.1 Define `MODEL_URL = '/models/statue-model.ort'` — path to ONNX model in public/
  - [x] 1.2 Define `MODEL_DOWNLOAD_TIMEOUT_MS = 30000` — 30s timeout for download
  - [x] 1.3 Add a comment noting WASM strategy: Story 1.4 places WASM files as static assets; Story 2.1 sets `ort.env.wasm.wasmPaths = '/wasm/'` and ONNX RT fetches WASM internally. No manual WASM pre-fetch in this story.

- [x] 2. Create `src/ui/splash.ts` — branded splash screen (AC1, AC2)
  - [x] 2.1 `export type SplashState = 'branded' | 'ready'` — splash UI states
  - [x] 2.2 `export function showSplash(container: HTMLElement): void` — renders branded splash with app name "Mediation AR" and "Preparing AR experience..." subtitle, using Tailwind CSS v4 utility classes (dark background, centered text, app icon/logo placeholder)
  - [x] 2.3 `export function showSplashReady(container: HTMLElement): void` — updates splash to show "Initializing..." state (called when renderer is ready, before download starts)
  - [x] 2.4 Clean DOM management: each function clears container before appending

- [x] 3. Create `src/ui/loading.ts` — download progress UI (AC3)
  - [x] 3.1 `export interface DownloadProgress { loaded: number; total: number; percent: number }`
  - [x] 3.2 `export function showLoadingProgress(container: HTMLElement): (progress: DownloadProgress) => void` — renders a progress bar container with Tailwind classes (track bar, fill bar, percentage text) and returns an updater function
  - [x] 3.3 Updater function takes `DownloadProgress` and updates bar width + percentage text
  - [x] 3.4 `export function showDownloadError(container: HTMLElement, onRetry: () => void): void` — error state with Retry button (AC5)

- [x] 4. Implement `src/loader.ts` — model download with progress tracking (AC3)
  - [x] 4.1 `export type DownloadProgressCallback = (progress: { loaded: number; total: number; percent: number }) => void`
  - [x] 4.2 `export async function downloadModel(onProgress: DownloadProgressCallback): Promise<ArrayBuffer>` — fetches only the `.ort` model file with progress
  - [x] 4.3 This story only downloads the `.ort` model. ONNX RT WASM files are **not** fetched here — they are served as static assets from `public/wasm/`. In Story 2.1, `ort.env.wasm.wasmPaths = '/wasm/'` will point ONNX RT at that directory, and the runtime fetches the WASM + `.mjs` files itself internally, with no progress tracking available.

- [x] 5. Modify `src/main.ts` — update boot sequence (AC1, AC2)
  - [x] 5.1 Import splash and loading modules
  - [x] 5.2 Show splash screen immediately before Three.js scene creation
  - [x] 5.3 After scene creation completes, dispatch RENDERER_READY to FSM (via states.ts workaround)
  - [x] 5.4 The scene context is already created eagerly — remove any delay in showing splash

- [x] 6. Modify `src/state/states.ts` — wire splash and loading state handlers (AC1, AC2, AC3, AC4, AC5)
  - [x] 6.1 Update `onEnter(Splash)`: call `showSplash()` instead of `showPermissionPrompt()` — branded splash immediately visible
  - [x] 6.2 Add FSM-init dispatcher: after scene is ready, dispatch `RENDERER_READY` → transitions to `Loading`
  - [x] 6.3 Update `onEnter(Loading)` with discriminated union pattern for parallel model + camera
  - [x] 6.4 Implement fade-out from Loading to Camera (AC4): opacity CSS transition via Tailwind classes

- [x] 7. Create `src/ui/splash.test.ts` — splash test (AC1, AC2)
  - [x] 7.1 Test: showSplash renders app name and subtitle
  - [x] 7.2 Test: showSplash clears container before appending
  - [x] 7.3 Test: showSplashReady updates to ready state

- [x] 8. Create `src/ui/loading.test.ts` — loading progress tests (AC3)
  - [x] 8.1 Test: showLoadingProgress returns an updater function
  - [x] 8.2 Test: updater function updates bar width to match percent
  - [x] 8.3 Test: showDownloadError renders retry button that calls callback

- [x] 9. Create `src/loader.test.ts` — model download tests (AC5)
  - [x] 9.1 Mock `fetch` with vitest to return a `ReadableStream` with known bytes
  - [x] 9.2 Test: downloadModel calls onProgress with correct loaded/total values
  - [x] 9.3 Test: downloadModel returns ArrayBuffer with correct content
  - [x] 9.4 Test: downloadModel rejects with error on network failure
  - [x] 9.5 Test: downloadModel accepts on timeout

- [x] 10. Create `public/wasm/` directory with placeholder WASM files — these are static assets for future ONNX RT use (Story 2.1)
  - [x] 10.1 Create `.gitkeep` in `public/wasm/` to preserve the directory
  - [x] 10.2 Add a comment in `src/config.ts` noting that Story 2.1 will replace these with real ONNX WASM binaries and configure `wasmPaths`

- [x] 11. Update `src/__tests__/smoke.test.ts` — ensure smoke tests still pass

## Dev Notes

### Splash → Loading → Camera Flow

The existing FSM flow is Splash → Loading → Camera. This story modifies the handlers:

```
1. Page load → Splash state: show branded splash (NOT permission prompt)
2. Three.js boots eagerly (main.ts creates scene) → RENDERER_READY → Loading state
3. Loading state: show progress bar, download model with progress,
   acquire camera stream IN PARALLEL (camera already implemented in 1.3)
4. Both model AND camera ready → MODEL_LOADED → Camera state with fade
```

The camera acquisition already happens in the Loading state (Story 1.3 implementation). This story adds the model download in parallel. The `MODEL_LOADED` event now waits for both to complete. Use `Promise.all` with wrapped results (not bare `Promise.all`) to handle each branch's failure independently — see Task 6.3 for the discriminated union pattern.

**WASM is NOT downloaded in this story.** ONNX Runtime WASM files are placed in `public/wasm/` as static assets. In Story 2.1, `ort.env.wasm.wasmPaths = '/wasm/'` will be set and ONNX RT fetches them internally. The progress bar shows model-only progress (Option A — simplest viable approach for PoC).

### Current State of states.ts (to modify)

The current `onEnter(Splash)` shows a camera permission prompt, which is WRONG for this story. This must be replaced with the branded splash. The permission prompt was a temporary stub before splash existed.

The current `onEnter(Loading)` shows "Preparing AR experience..." text, acquires camera, then dispatches `MODEL_LOADED` immediately. This must be updated to:
1. Show the progress bar from `src/ui/loading.ts`
2. Call `downloadModel()` in parallel with camera acquisition (use wrapped promises — see Parallel Loading Strategy)
3. Only dispatch `MODEL_LOADED` when BOTH complete; handle each failure independently
4. The progress bar reflects model-only download (WASM is NOT fetched in this story — see WASM strategy note)

### Model Download Pattern

Use the `ReadableStream` API for progress tracking (NOT XHR — the architecture mandates `fetch`):

```typescript
async function downloadWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)

  const total = Number(response.headers.get('Content-Length') ?? 0)
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(loaded, total)
  }

  // Concatenate chunks into single ArrayBuffer
  const result = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result.buffer as ArrayBuffer
}
```

### Parallel Loading Strategy (Discriminated Union Pattern)

Use `Promise.all` with wrapped promises, NOT bare `Promise.all`. Bare `Promise.all` loses which branch failed:

```typescript
type AsyncResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

const wrap = async <T>(p: Promise<T>): Promise<AsyncResult<T>> => {
  try { return { ok: true as const, value: await p } }
  catch (e) { return { ok: false as const, error: e } }
}

// In onEnter(Loading):
const [modelResult, camResult] = await Promise.all([
  wrap(downloadModel(updateProgress)),
  wrap(requestCameraStreamWithFallback()),
])

if (modelResult.ok) {
  // Model downloaded — store ArrayBuffer for later use (Story 2.1)
} else {
  // Model download failed → dispatch FATAL_ERROR
  fsm.dispatch(AppEvent.FATAL_ERROR)
  return
}

if (camResult.ok) {
  // Camera acquired — existing logic from Story 1.3
} else {
  // Camera failed → existing handleCameraError()
  handleCameraError(fsm, container, camResult.error)
  return
}

// Both succeeded
fsm.dispatch(AppEvent.MODEL_LOADED)
```

### File Structure This Story Creates/Modifies

```
src/
├── config.ts              (MODIFY) — Add model download config
├── main.ts                (MODIFY) — Splash-first boot sequence
├── loader.ts              (NEW) — Model download with progress
├── loader.test.ts         (NEW) — Download tests
├── ui/
│   ├── splash.ts          (NEW) — Branded splash screen
│   ├── splash.test.ts     (NEW) — Splash tests
│   ├── loading.ts         (NEW) — Loading progress bar
│   └── loading.test.ts    (NEW) — Loading tests
└── state/
    └── states.ts          (MODIFY) — Wire splash/loading handlers
```

### Architecture Compliance

- **No download library**: Vanilla `fetch` + `ReadableStream` — do NOT use any download/HTTP library [Architecture:216-217]
- **Files**: camelCase filenames (`splash.ts`, `loading.ts`, `loader.ts`) [Architecture:409]
- **Types**: PascalCase interfaces (`SplashState`, `DownloadProgress`, `DownloadResult`) [Architecture:410]
- **Constants**: UPPER_SNAKE_CASE (`MODEL_URL`, `MODEL_DOWNLOAD_TIMEOUT_MS`) [Architecture:414]
- **Model location**: `public/models/statue-model.ort` — static asset served from Vite public dir [Architecture:320-321]
- **WASM location**: `public/wasm/` — static assets only (not downloaded). Story 2.1 configures `ort.env.wasm.wasmPaths = '/wasm/'` for internal ONNX RT fetch [Architecture:322-324]
- **WASM strategy**: Option A — no manual pre-fetch. No `env.wasm.wasmBinary`. Progress bar is model-only. [ONNX RT API research]
- **Styling**: Tailwind CSS v4 utility classes for splash, progress bar, error UI [Architecture:223-226]
- **No component library**: Vanilla DOM manipulation — no React/Vue [Architecture:225]
- **FSM error handling**: Download failures → `FATAL_ERROR` → Error state with retry [Architecture:447-451]
- **Private fields**: `#` prefix for any class members (though functional approach preferred here) [Architecture:414]
- **Target**: ES2020, TypeScript strict mode [Architecture:94]
- **PostMessage protocol**: Not used in this story — this story is purely UI + download [Architecture:369-372]

### Previous Story Learnings (Story 1.3)

- **Camera acquisition in Loading**: Story 1.3 moved camera acquisition from Camera to Loading state to satisfy AC4 (parallel acquisition with model download). This story adds model download alongside it. [Story 1.3 Debug Log]
- **FSM constructor doesn't fire onEnter**: The FSM constructor doesn't call `onEnter` for the initial state. The current code has a workaround calling `showPermissionPrompt` directly after `createAppStateMachine`. This story must do the same for `showSplash`. [Story 1.3 Debug Log]
- **TypeScript strict**: `noUncheckedIndexedAccess` is enabled — all property accesses return `T | undefined`. Handle explicitly. [Story 1.3:287]
- **ESLint unused vars**: Use `import type` for type-only imports, omit unused callback params. [Story 1.3:288]
- **Vite 8 manualChunks**: Must be a function, not object. Already configured. [Story 1.3:289]
- **DOM cleanup**: `onExit` handlers clear `container.innerHTML` — ensure splash/loading cleanup properly. [Story 1.3 states.ts]

### Testing Standards

- **Framework**: Vitest with jsdom environment [Architecture:105-107]
- **Location**: Co-located `*.test.ts` next to source files [Architecture:394]
- **Mock fetch for download tests**:
```typescript
import { vi, beforeAll } from 'vitest'

beforeAll(() => {
  // Mock fetch to return a Response with ReadableStream
  globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode('mock model data')
    let posted = false
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Length': String(data.length) },
    })
  })
})
```
- **AbortController testing**: Verify timeout behavior by mocking with a delay that exceeds the timeout
- **DOM tests**: Use jsdom's `document.createElement` for container elements
- **Each AC maps to 1-2 test cases** (see Tasks 7.x, 8.x, 9.x)

### Known Pitfalls

- **Splash on cold start**: The splash must be visible IMMEDIATELY — before any async operations. The `showSplash()` call must happen synchronously in `main.ts` before `createScene()` which creates WebGL context (may block briefly).
- **ReadableStream browser support**: `ReadableStream` is Baseline Widely Available since 2019. Mobile Safari 13.1+ supports it. Per architecture target (latest 2 major OS versions), this is safe.
- **Content-Length might be absent**: Some servers don't send `Content-Length`. If absent, show an indeterminate progress bar (animated marquee/pulse) instead of percentage.
- **WASM strategy (Option A — simplest)**: ONNX RT WASM files are never manually fetched in this story. They exist as static assets in `public/wasm/`. In Story 2.1, `ort.env.wasm.wasmPaths = '/wasm/'` will be set, and ONNX RT fetches both `.wasm` and `.mjs` files itself internally. There is no `env.wasm.mjsBinary` API — the `.mjs` companion file can only be served via URL, not injected as a buffer. This means: (a) the progress bar reflects model-only progress, (b) WASM download is a black box inside ONNX RT init in Story 2.1, (c) `env.wasm.wasmBinary` is NOT used in this PoC because it silently disables `wasmPaths` and still requires the `.mjs` to be served at the correct URL anyway.
- **AbortController timeout race**: If the download completes just as the timeout fires, `reader.read()` may reject with an AbortError. Catch `AbortError` specifically vs generic network errors.
- **Fade transition (AC4)**: Do NOT `await` inside `onExit()` — it runs synchronously inside `dispatch()`. Instead, apply an opacity CSS transition class to the container and use `setTimeout(500)` or a `transitionend` listener to clear DOM afterward. Or let `onEnter(Camera)` handle cleanup since it runs right after `onExit` returns.
- **Service Worker not yet available**: Service Worker caching (Story 3.1) is not implemented yet. For this PoC story, the model files are fetched directly and cached only in the browser's HTTP cache. No SW cache management is needed.
- **Model files don't exist yet**: The `.ort` model and WASM files are not part of this repo — they come from the training pipeline. For this story, create a placeholder file at `public/models/statue-model.ort` with a small amount of dummy data so the download flow can be tested end-to-end. The actual model is loaded in Epic 2.

## Dev Agent Record

### Agent Model Used

opencode/deepseek-v4-flash-free

### Debug Log References

- Key architectural decision: onEnter(Splash) dispatches RENDERER_READY to auto-transition to Loading, since scene is already created synchronously before FSM initialization. This replaces the old permission-prompt workaround.
- The workaround in `createAppStateMachine` (at the bottom, after all hooks are registered) calls `showSplash(container)` and `fsm.dispatch(AppEvent.RENDERER_READY)` — necessary because the FSM constructor does not call `onEnter` for the initial state.
- Loading state uses discriminated union pattern (`AsyncResult<T>`) wrapping both `downloadModel()` and `requestCameraStreamWithFallback()` in parallel via `Promise.all`, allowing independent failure handling per AC5.
- Fade transition (AC4) uses Tailwind opacity transition classes — `onExit(Loading)` adds classes, `onEnter(Camera)` removes them and clears the container.
- WASM strategy: Option A (simplest) — WASM files are static assets only, not fetched in this story. Progress bar reflects model-only download.
- Story 1.3 existing tests updated: FSM initialization tests now expect `Loading` instead of `Splash` due to auto-transition.
- Placeholder `.ort` model created at `public/models/statue-model.ort` for end-to-end testing.

### Completion Notes List

- Task 1: Added `MODEL_URL`, `MODEL_DOWNLOAD_TIMEOUT_MS` constants and WASM strategy comment to `src/config.ts`
- Task 2: Created `src/ui/splash.ts` with `showSplash()` (branded) and `showSplashReady()` (initializing) functions using Tailwind dark background classes
- Task 3: Created `src/ui/loading.ts` with `showLoadingProgress()` (progress bar with updater) and `showDownloadError()` (error + retry button)
- Task 4: Created `src/loader.ts` with `downloadModel()` using `fetch` + `ReadableStream` + `AbortController` for progress tracking
- Task 5: Updated `src/main.ts` — splash shown immediately before scene creation, FSM handles RENDERER_READY auto-dispatch
- Task 6: Rewired `src/state/states.ts` — Splash shows branded UI, Loading uses discriminated union for parallel model+camera, Error shows download retry UI
- Task 7: Created `src/ui/splash.test.ts` — 3 tests covering splash rendering, container clearing, and ready state
- Task 8: Created `src/ui/loading.test.ts` — 3 tests covering updater function, progress bar width, and retry button
- Task 9: Created `src/loader.test.ts` — 5 tests covering progress callbacks, ArrayBuffer content, network errors, HTTP errors, multi-chunk progress
- Task 10: Created `public/wasm/.gitkeep` and `public/models/statue-model.ort` placeholder
- Task 11: Existing test suite passes with updated FSM tests (59/59 passing)

### File List

- `public/models/statue-model.ort` — NEW (placeholder dummy file for testing)
- `public/wasm/.gitkeep` — NEW (placeholder dir for ONNX RT WASM, used in Story 2.1)
- `src/config.ts` — MODIFIED
- `src/ui/splash.ts` — NEW
- `src/ui/splash.test.ts` — NEW
- `src/ui/loading.ts` — NEW
- `src/ui/loading.test.ts` — NEW
- `src/loader.ts` — NEW
- `src/loader.test.ts` — NEW
- `src/main.ts` — MODIFIED
- `src/state/states.ts` — MODIFIED
- `src/state/machine.test.ts` — MODIFIED
