# Story 1.3: Camera Permission & Live Preview with Camera Feed as Scene Background

Status: done

## Story

As a visitor,
I want to grant camera permission and see the rear-facing camera feed displayed as the background of a Three.js scene,
So that I can point my phone at the statue and the app is ready to overlay the colored replica.

## Acceptance Criteria

**AC1: Browser permission prompt for camera access**
Given the app is loaded on a mobile device with a rear-facing camera
When the app requests camera access
Then the browser permission prompt is shown asking the visitor to Allow or Deny camera access

**AC2: Rear-facing camera stream acquisition via getUserMedia**
Given the visitor taps Allow on the permission prompt
When getUserMedia is called with `facingMode: { ideal: 'environment' }` constraints
Then the rear-facing camera stream is acquired and starts playing in a hidden `<video>` element

**AC3: Camera feed as Three.js scene background**
Given the camera stream is active and the model download completes (from Story 1.4)
When the Three.js scene is initialized with a PerspectiveCamera and WebGLRenderer
Then the renderer is attached to the page's DOM and the camera feed is rendered as a textured background plane in the scene

**AC4: Parallel camera acquisition (no dependency on Three.js boot)**
Given the app is in the `splash` or `loading` state
When camera acquisition begins
Then the stream is acquired in parallel with model download (no need to wait for Three.js to be ready)

**AC5: Permission denied error handling**
Given camera permission was denied
When the app detects the permission error
Then a user-friendly error message is displayed explaining that camera access is required, with a retry button

**AC6: No rear-facing camera / OverconstrainedError fallback**
Given the device has no rear-facing camera
When getUserMedia fails with OverconstrainedError
Then the app falls back to any available camera or displays an unsupported device message

## Tasks / Subtasks

- [x] 1. Create `src/config.ts` with camera configuration constants (AC2, AC4)
  - [x] 1.1 Define `CAMERA_CONSTRAINTS: MediaStreamConstraints` with `facingMode: { ideal: 'environment' }`, prefer HD (1280x720) resolution
  - [x] 1.2 Define fallback constraints (no facingMode) for AC6
  - [x] 1.3 Define `FALLBACK_CAMERA_CONSTRAINTS` for devices without rear camera
  - [x] 1.4 Define `FRAME_CAPTURE_INTERVAL_MS = 33` (~30fps capture cadence)
- [x] 2. Implement `src/camera/stream.ts` — camera stream acquisition (AC1, AC2, AC4, AC5, AC6)
  - [x] 2.1 `export type CameraErrorCode = 'PERMISSION_DENIED' | 'NO_CAMERA' | 'OVERRULED_BY_CONSTRAINTS' | 'UNKNOWN'`
  - [x] 2.2 `export interface CameraResult { stream: MediaStream; deviceLabel: string }`
  - [x] 2.3 `export interface CameraError { code: CameraErrorCode; message: string; originalError?: DOMException | Error }`
  - [x] 2.4 `export async function requestCameraStream(constraints?: MediaStreamConstraints): Promise<CameraResult>` — main entry point
    - Handle permission denial → return `CameraError` with code `PERMISSION_DENIED`
    - Handle OverconstrainedError → return `CameraError` with code `OVERRULED_BY_CONSTRAINTS`
    - Handle general errors → return `CameraError` with code `UNKNOWN`
    - Succeed → return `CameraResult` with stream and device label
  - [x] 2.5 `export async function requestCameraStreamWithFallback(): Promise<CameraResult | CameraError>` — tries environment-facing first, falls back to any camera
  - [x] 2.6 `export function createHiddenVideoElement(stream: MediaStream): HTMLVideoElement` — creates hidden video for frame capture
  - [x] 2.7 `export function stopCameraStream(stream: MediaStream): void` — stops all tracks
- [x] 3. Implement `src/camera/stream.test.ts` — unit tests for stream module (AC1, AC2, AC5, AC6)
  - [x] 3.1 Mock `navigator.mediaDevices.getUserMedia` with vitest
  - [x] 3.2 Test: successful stream acquisition returns CameraResult
  - [x] 3.3 Test: permission denied error returns PERMISSION_DENIED code
  - [x] 3.4 Test: OverconstrainedError returns OVERRULED_BY_CONSTRAINTS code
  - [x] 3.5 Test: fallback tries without facingMode when environment fails
  - [x] 3.6 Test: stopCameraStream stops all tracks
- [x] 4. Implement `src/camera/frame.ts` — basic frame capture (pipelines into future stories)
  - [x] 4.1 `export type FrameData = { width: number; height: number; data: ArrayBuffer }`
  - [x] 4.2 `export class FrameCapture` class with:
    - Constructor takes `HTMLVideoElement`
    - `capture(): FrameData | null` — draws current video frame to OffscreenCanvas, extracts pixels
    - `start(callback: (frame: FrameData) => void): void` — starts interval-based capture loop
    - `stop(): void` — stops capture loop
    - Uses `OffscreenCanvas` when available, falls back to `HTMLCanvasElement`
  - [x] 4.3 Frame capture uses `OffscreenCanvas` for off-main-thread readiness (future transfer to Worker)
- [x] 5. Implement `src/render/scene.ts` — Three.js scene with video background (AC3)
  - [x] 5.1 `export interface SceneContext { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; }`
  - [x] 5.2 `export function createScene(container: HTMLElement): SceneContext` — creates Three.js scene, PerspectiveCamera (75 FOV, aspect from container), WebGLRenderer (alpha: false, antialias: true), appends renderer.domElement to container
  - [x] 5.3 `export function createVideoBackground(scene: THREE.Scene, video: HTMLVideoElement): THREE.Mesh` — creates a plane filling the camera frustum with `VideoTexture` mapped as the material map
  - [x] 5.4 `export function startRenderLoop(ctx: SceneContext, onFrame?: () => void): () => void` — starts `requestAnimationFrame` loop, returns stop function
  - [x] 5.5 `export function resizeRenderer(ctx: SceneContext, container: HTMLElement): void` — handles responsive resize
  - [x] 5.6 Scene camera uses `PerspectiveCamera` (matching FOV to device camera for natural alignment — approximate, exact calibration deferred to Epic 2)
- [x] 6. Implement `src/render/scene.test.ts` — unit tests for scene module (AC3)
  - [x] 6.1 Test: createScene creates scene, camera, renderer with correct structure
  - [x] 6.2 Test: createVideoBackground adds mesh to scene
  - [x] 6.3 Test: startRenderLoop returns a stop function
  - [x] 6.4 Test: resizeRenderer updates aspect ratio and projection matrix
- [x] 7. Create `src/ui/shared/permission.ts` — camera permission UI (AC5)
  - [x] 7.1 `export function showPermissionPrompt(container: HTMLElement, onAllow: () => void): void` — renders a Tailwind-styled prompt explaining camera is needed, with "Allow Camera Access" button that triggers onAllow
  - [x] 7.2 `export function showPermissionDenied(container: HTMLElement, onRetry: () => void): void` — renders error message + retry button
  - [x] 7.3 `export function showCameraError(container: HTMLElement, message: string, onRetry: () => void): void` — generic camera error + retry
  - [x] 7.4 Clean DOM management: each function clears container before appending
- [x] 8. Wire FSM lifecycle hooks in `src/state/states.ts` (AC4, AC5)
  - [x] 8.1 Uncomment/replace stubbed `mountCameraUI` / `unmountCameraUI` in `onEnter(AppState.Camera)` / `onExit(AppState.Camera)`
  - [x] 8.2 Uncomment/replace stubbed `mountErrorUI` / `unmountErrorUI` to use `showPermissionDenied` when camera error
  - [x] 8.3 The Camera state onEnter triggers `requestCameraStreamWithFallback()` and on success passes stream to scene via the app context (use a simple global/exported app state ref for now — `let currentStream: MediaStream | null`)
- [x] 9. Update `src/main.ts` — boot sequence wiring
  - [x] 9.1 Create app container `<div id="app">` with full-screen layout
  - [x] 9.2 On boot: initialize FSM, create Three.js scene (but don't attach video yet — camera isn't ready)
  - [x] 9.3 Wire splash state: show splash UI (basic text + "Preparing..." for now; full branded splash deferred to Story 1.4)
  - [x] 9.4 Wire camera state: acquire stream, pass to render/scene, start render loop
  - [x] 9.5 Wire error state: show permission denied or generic error with retry that dispatches RETRY event
  - [x] 9.6 Wire unsupported state: show message that device can't run the experience

## Dev Notes

### Camera Module Architecture

```
src/camera/
├── stream.ts        # NEW — getUserMedia setup, constraints, permission
├── frame.ts         # NEW — OffscreenCanvas-based frame capture
└── stream.test.ts   # NEW — Vitest tests (mock getUserMedia)
```

**Stream lifecycle:**
1. `requestCameraStreamWithFallback()` is called from FSM `onEnter(Camera)` handler
2. On success: `CameraResult.stream` is stored globally + passed to `createVideoBackground()` in scene
3. On error: `CameraError` is mapped to appropriate UI via FSM error dispatch
4. On transition away from Camera state: `stopCameraStream()` is called in `onExit(Camera)`

**Frame capture design:**
- `FrameCapture` uses `OffscreenCanvas` for zero-copy transfer readiness
- Captures at configurable interval (default 30fps from `src/config.ts`)
- In this story, frames are logged/accepted but NOT yet transferred to Worker
- Full Worker integration is in Story 1.5 (Responsive Frame Capture Pipeline)

### Three.js Scene Design

```
src/render/
├── scene.ts         # NEW — Three.js scene, camera, lights, renderer
└── scene.test.ts    # NEW — Vitest tests
```

**Scene setup for AR:**
- `PerspectiveCamera` with 75 FOV (matching typical mobile camera FOV approximately)
- `WebGLRenderer` with `alpha: false` (camera feed is opaque background)
- Renderer attached to `#app` container, fills viewport
- Background video plane positioned at `z = -2` (behind AR overlay origin)
- `VideoTexture` updates automatically each frame via `requestAnimationFrame`
- The video plane geometry is a large rectangle mapped to fill the camera frustum:
  - Width = `2 * Math.tan(FOV / 2) * distance * aspect`
  - Height = width / aspect

**Render loop:**
```
function renderLoop(time: number) {
  requestAnimationFrame(renderLoop)
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    videoTexture.needsUpdate = true
  }
  renderer.render(scene, camera)
  onFrame?.()
}
```

### FSM Integration

The existing `createAppStateMachine()` in `src/state/states.ts` has stubbed lifecycle hooks for all states. This story replaces the Camera and Error stubs with real implementations:

```typescript
// Pattern for camera state wiring:
import { requestCameraStreamWithFallback, stopCameraStream } from '../camera/stream'
import { createScene, createVideoBackground, startRenderLoop } from '../render/scene'

let currentStream: MediaStream | null = null
let sceneContext: SceneContext | null = null
let stopRenderLoop: (() => void) | null = null

fsm.onEnter(AppState.Camera, async (prev) => {
  const result = await requestCameraStreamWithFallback()
  if ('stream' in result) {
    currentStream = result.stream
    const video = createHiddenVideoElement(result.stream)
    await video.play()
    if (sceneContext) {
      createVideoBackground(sceneContext.scene, video)
      stopRenderLoop = startRenderLoop(sceneContext, () => {})
    }
  } else {
    // handle CameraError — dispatch FATAL_ERROR or show in-place error
  }
})

fsm.onExit(AppState.Camera, () => {
  stopRenderLoop?.()
  if (currentStream) stopCameraStream(currentStream)
})
```

The scene context should be initialized earlier during `splash` → `loading` transition (or at boot). For this story:
- Create scene context eagerly at boot in `main.ts`
- Pass it to state hooks via a simple module-level variable

### Error Handling Patterns

Camera errors map to FSM events:
| Condition | Error Code | FSM Action |
|-----------|------------|------------|
| User denies permission | `PERMISSION_DENIED` | Show error UI with retry button → dispatches `RETRY` event |
| No camera hardware | `NO_CAMERA` | Show unsupported message → dispatches `UNSUPPORTED` event |
| OverconstrainedError | `OVERRULED_BY_CONSTRAINTS` | Retry with `FALLBACK_CAMERA_CONSTRAINTS` (no facingMode) |
| Unknown error | `UNKNOWN` | Show generic error with retry → dispatches `RETRY` event |

The OverconstrainedError case (AC6) tries `getUserMedia` without `facingMode` constraint as fallback before giving up.

### Architecture Compliance

- **No library for camera**: Vanilla `navigator.mediaDevices.getUserMedia` API — do NOT use any WebRTC wrapper library [Architecture:158]
- **Files**: camelCase filenames (`stream.ts`, `frame.ts`, `scene.ts`) [Architecture:409]
- **Types**: PascalCase interfaces (`CameraResult`, `CameraError`, `SceneContext`) [Architecture:410]
- **Constants**: UPPER_SNAKE_CASE (`CAMERA_CONSTRAINTS`, `FRAME_CAPTURE_INTERVAL_MS`) [Architecture:414]
- **Private fields**: `#` prefix on FrameCapture class members [Architecture:414]
- **Video element**: Hidden `<video>` element for frame capture — not displayed directly [Architecture:137]
- **Parallel loading**: Camera acquisition starts in parallel with model download per Architecture loading sequence [Architecture:136-141]
- **Camera UI**: Tailwind CSS v4 utility classes for permission prompt, error screens [Architecture:223-226]
- **No component library**: No React/Vue — vanilla DOM manipulation for UI [Architecture:225]
- **Target**: ES2020, TypeScript strict mode [Architecture:94]

### File Structure This Story Creates/Modifies

```
src/
├── config.ts                      (NEW) — Camera config constants
├── main.ts                        (MODIFY) — Boot sequence wiring
├── camera/
│   ├── stream.ts                  (NEW) — Camera stream acquisition
│   ├── stream.test.ts             (NEW) — Stream tests
│   └── frame.ts                   (NEW) — Frame capture
├── render/
│   ├── scene.ts                   (NEW) — Three.js scene + video bg
│   └── scene.test.ts              (NEW) — Scene tests
├── state/
│   └── states.ts                  (MODIFY) — Wire camera/error lifecycle hooks
└── ui/
    └── shared/
        └── permission.ts          (NEW) — Camera permission UI components
```

### Testing Standards

- **Framework**: Vitest with jsdom environment [Architecture:105-107]
- **Location**: Co-located `*.test.ts` next to source files [Architecture:394]
- **Maxwell's (getUserMedia)**: Must mock `navigator.mediaDevices.getUserMedia` since jsdom doesn't implement it
  ```typescript
  import { vi, beforeAll } from 'vitest'
  beforeAll(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      configurable: true,
      writable: true,
    })
  })
  ```
- **Three.js mocking**: Vitest + jsdom doesn't support WebGL. Mock `THREE.WebGLRenderer`:
  ```typescript
  vi.mock('three', async () => {
    const actual = await vi.importActual('three')
    return {
      ...actual,
      WebGLRenderer: vi.fn().mockImplementation(() => ({
        domElement: document.createElement('canvas'),
        setSize: vi.fn(),
        render: vi.fn(),
        setAnimationLoop: vi.fn(),
        dispose: vi.fn(),
      })),
    }
  })
  ```
- **Video element**: Mock `HTMLMediaElement.HAVE_CURRENT_DATA` = 2 for tests
- **Each AC maps to 1-2 test cases** (see Tasks 3.x and 6.x)

### Known Pitfalls

- **getUserMedia requires user gesture**: The initial call MUST be triggered by a user gesture (click/tap) on mobile Safari. The permission prompt button click counts. For this story, the camera request is triggered by the visitor tapping "Allow Camera Access" on the permission prompt UI.
- **Video autoplay restriction**: On mobile iOS Safari, `video.play()` must be called from a user gesture. The permission button click serves as the user gesture for both getUserMedia and video.play().
- **VideoTexture needsUpdate**: Three.js `VideoTexture` requires `needsUpdate = true` each frame in the render loop, even when the video is playing. Without this, the texture shows a static frame.
- **OverconstrainedError on iOS**: Some iOS devices only have one camera. If `facingMode: { ideal: 'environment' }` fails, fall back to any camera with `{}` constraints.
- **renderer.domElement z-index**: The WebGL canvas must be behind any DOM overlay UI. Use CSS `z-index` layering: renderer at `z-index: 0`, UI overlays at `z-index: 10+`.
- **Full-screen on mobile**: Set `renderer.domElement.style.display = 'block'` and size to `container.clientWidth`/`container.clientHeight` — use `ResizeObserver` if available.
- **TypeScript strict**: `noUncheckedIndexedAccess` is enabled — all object property accesses return `T | undefined`. Handle this explicitly. [tsconfig:7]
- **ESLint unused vars**: Previous stories used `import type` for type-only imports and omitted unused callback params to avoid `@typescript-eslint/no-unused-vars` errors. Follow this pattern. [Story 1.2 Debug Log]
- **Vite 8 manualChunks**: Must be a function, not an object. Already configured. [vite.config.ts:18-20]

## Dev Agent Record

### Agent Model Used

deepseek-v4-flash-free (opencode)

### Debug Log References

- WebGLRenderer mock required vi.hoisted() to avoid hoisting issues with vi.mock factory
- createAppStateMachine signature changed to accept container parameter — existing machine.test.ts updated with createMockContainer helper
- Three.js VideoTexture renders correctly with requestAnimationFrame loop calling renderer.render each frame
- FSM constructor doesn't fire onEnter for initial state — added explicit showPermissionPrompt call in createAppStateMachine
- Moved camera acquisition from Camera to Loading state to satisfy AC4 (parallel acquisition with model download)
- Camera acquisition success auto-dispatches MODEL_LOADED to transition to Camera state
- onEnter(Camera) re-attaches renderer canvas to DOM (was removed by onExit splash/content clearing)

### Completion Notes List

1. `src/config.ts` created with CAMERA_CONSTRAINTS, FALLBACK_CAMERA_CONSTRAINTS, FRAME_CAPTURE_INTERVAL_MS
2. `src/camera/stream.ts` implements full camera acquisition with typed error handling (PERMISSION_DENIED, NO_CAMERA, OVERRULED_BY_CONSTRAINTS, UNKNOWN)
3. `src/camera/stream.test.ts` — 12 test cases covering all error paths, fallback logic, and stream lifecycle
4. `src/camera/frame.ts` implements FrameCapture with OffscreenCanvas, interval-based capture at 30fps
5. `src/render/scene.ts` implements Three.js scene creation, VideoTexture background plane, render loop, resize handling
6. `src/render/scene.test.ts` — 4 test cases for scene creation, video background, render loop, resize
7. `src/ui/shared/permission.ts` — camera permission prompt, denied error, and generic error UI with Tailwind classes
8. `src/state/states.ts` — wired Camera and Error FSM hooks with real implementations, added setSceneContext() and handleCameraError()
9. `src/main.ts` — boot sequence creates app container, Three.js scene, FSM, ResizeObserver
10. `src/state/machine.test.ts` — updated to pass container parameter to createAppStateMachine()

## Change Log

- 2026-05-18 — Implemented Story 1.3: Camera Permission & Live Preview. Created config.ts, camera/stream.ts, camera/frame.ts, render/scene.ts, ui/shared/permission.ts, and their tests. Modified states.ts (FSM hooks), main.ts (boot wiring), machine.test.ts (container param).

### File List

- `src/config.ts` — NEW
- `src/camera/stream.ts` — NEW
- `src/camera/stream.test.ts` — NEW
- `src/camera/frame.ts` — NEW
- `src/render/scene.ts` — NEW
- `src/render/scene.test.ts` — NEW
- `src/ui/shared/permission.ts` — NEW
- `src/state/states.ts` — MODIFIED
- `src/state/machine.test.ts` — MODIFIED
- `src/main.ts` — MODIFIED
