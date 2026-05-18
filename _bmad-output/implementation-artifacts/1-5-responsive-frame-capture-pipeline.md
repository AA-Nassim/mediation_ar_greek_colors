# Story 1.5: Responsive Frame Capture Pipeline

baseline_commit: 939d62094cbaa36d21c3a891a995235fa24a9364
Status: done

## Story

As a developer,
I want camera frames captured via OffscreenCanvas and transferred to a Web Worker as ArrayBuffers,
So that the camera feed stays responsive and inference runs off the main thread.

## Acceptance Criteria

**AC1: Capture loop starts when Camera state is entered**
Given the camera stream is active and the Three.js scene is running
When the FSM enters the Camera state
Then a frame capture loop begins using OffscreenCanvas at FRAME_CAPTURE_INTERVAL_MS cadence (~30fps) via setInterval

**AC2: Frames transferred as zero-copy ArrayBuffers via postMessage**
Given a frame is captured on the OffscreenCanvas
When the canvas pixels are extracted as an ArrayBuffer
Then the buffer is transferred via `postMessage({ type: 'FRAME_DATA', payload: buffer }, [buffer])` to the Web Worker
And after transfer, the originating ArrayBuffer becomes detached (byteLength === 0) and MUST NOT be reused

**AC3: Web Worker acknowledges and is non-blocking**
Given the Web Worker receives the FRAME_DATA message
When `self.onmessage` is dispatched
Then the worker acknowledges receipt (via FRAME_ACK) and the main thread continues capturing the next frame without waiting for inference
And frames may be dropped if worker processing lags; the main thread MUST NOT block awaiting ACK

**AC4: Worker enters ready state on boot**
Given the Web Worker is initialized
When the worker boots
Then it posts `{ type: 'WORKER_READY' }` to the main thread and accepts FRAME_DATA messages immediately (no gating on WORKER_READY)

**AC5: Capture loop pauses on error/lost, resumes on re-entry**
Given the capture loop is running
When the FSM transitions to Lost state
Then the capture loop pauses (frames stop being sent) but the worker stays alive for fast re-acquisition
When the FSM transitions to Error state
Then the capture loop pauses AND the worker is terminated for clean restart on retry
When the FSM transitions to Tracking (from Lost) or Camera (from Loading via Error→RETRY)
Then the capture loop resumes

**AC6: Worker exports message types for type-safe communication**
Given the message protocol is defined
When the types are imported
Then `WorkerOutboundMessage` and `WorkerInboundMessage` discriminated unions are available from `src/types/events.ts`

**AC7: Capture loop MUST NOT accumulate unbounded pending frames**
Given the capture loop is active and a frame has been sent to the worker
When the worker has not yet acknowledged
Then the capture loop MUST skip capturing (drop the frame) rather than queueing another transfer
This prevents unbounded memory growth when worker processing is delayed (e.g., inference backpressure in Epic 2)

## Tasks / Subtasks

- [x] 1. Add Web Worker message types to `src/types/events.ts` (AC6)
  - [x] 1.1 Define `WorkerOutboundMessage` — messages Main Thread sends to Worker: `FRAME_DATA`, `TERMINATE`
  - [x] 1.2 Define `WorkerInboundMessage` — messages Worker sends to Main Thread: `WORKER_READY`, `FRAME_ACK`, `INFERENCE_RESULT` (placeholder for Epic 2), `INFERENCE_ERROR` (placeholder for Epic 2)
  - [x] 1.3 Export both types from `src/types/index.ts`

- [x] 2. Create `src/worker/index.ts` — Web Worker entry point (AC3, AC4)
  - [x] 2.1 On boot: post `{ type: 'WORKER_READY' }` immediately
  - [x] 2.2 `self.onmessage` handler: receives `FRAME_DATA`, posts `{ type: 'FRAME_ACK', payload: { frameId } }` back
  - [x] 2.3 Handle `TERMINATE` message: close worker gracefully (`self.close()`)
  - [x] 2.4 Use `import { WorkerInboundMessage, WorkerOutboundMessage } from '../types/events'` for type safety (type-only, no runtime dependency)
  - [x] 2.5 Export message handler factory for testability: `export function createWorkerHandler()`

- [x] 3. Modify `src/camera/frame.ts` — integrate with Web Worker (AC2, AC7)
  - [x] 3.1 Add `startWithWorker(worker: Worker, onAck?: (frameId: number) => void): void` method — captures frame and posts to worker with transfer list. Enforce single in-flight: if a frame is pending ACK (`#awaitingAck === true`), skip capture tick (drop frame) instead of queuing.
  - [x] 3.2 Add private `#awaitingAck: boolean = false` — set true before postMessage, cleared in onAck callback. On each capture tick, if `#awaitingAck` is true, `return` immediately.
  - [x] 3.3 Add `frameId` counter (incremented per capture) for ACK correlation
  - [x] 3.4 The `capture()` method already returns `FrameData` with `data: ArrayBuffer` — use `FrameData.data` as the transferable
  - [x] 3.5 Do NOT remove existing `start(callback)` / `stop()` methods — they may be reused by tests or future stories
  - [x] 3.6 Existing `capture()` and `#initCanvas()` behavior: preserve **exactly** as-is

- [x] 4. Modify `src/state/states.ts` — wire capture loop to FSM lifecycle (AC1, AC5)
  - [x] 4.1 In `onEnter(Camera)`: after mounting renderer DOM, create Web Worker from `new Worker(new URL('../worker/index.ts', import.meta.url), { type: 'module' })`, call `frameCapture.startWithWorker(worker)`, store worker ref
  - [x] 4.2 In `onExit(Camera)`: call `frameCapture.stop()`, post `{ type: 'TERMINATE' }` to worker (graceful — worker self-closes via self.close()), null refs — BEFORE stopping camera stream. Do NOT call `worker.terminate()` — the TERMINATE message protocol provides orderly shutdown.
  - [x] 4.3 In `onEnter(Error)`: if frame capture is running, pause it (call `frameCapture.stop()`)
  - [x] 4.4 In `onExit(Error)` (RETRY path): if worker is available, re-create worker and restart capture
  - [x] 4.5 In `onEnter(Lost)`: pause capture (`frameCapture.stop()`) but do NOT terminate worker
  - [x] 4.6 In `onExit(Lost)` (re-acquire): resume capture (`frameCapture.startWithWorker(worker)`) with existing worker
  - [x] 4.7 Thread a `FrameCapture` instance through the module-level state alongside `currentStream`, `sceneContext`, `stopRenderLoopFn` — do NOT instantiate inside lifecycle hooks (would lose reference across transitions)

- [x] 5. Create `src/worker/index.test.ts` — Web Worker tests (AC3, AC4, AC6)
  - [x] 5.1 Mock `self.onmessage` / `self.postMessage` using `vi.fn()` — see `src/__tests__/smoke.test.ts` for vitest setup
  - [x] 5.2 Test: on boot, worker posts WORKER_READY
  - [x] 5.3 Test: on FRAME_DATA, worker posts FRAME_ACK with matching frameId
  - [x] 5.4 Test: on TERMINATE, worker calls self.close()
  - [x] 5.5 Test: exhaustive switch on inbound message types uses `never` assertion (prevents unhandled message types at compile time)

- [x] 6. Create `src/camera/frame.test.ts` — frame capture integration tests (AC1, AC2, AC5, AC7)
  - [x] 6.1 Mock `OffscreenCanvas` and `Worker` in vitest jsdom environment
  - [x] 6.2 Test: `startWithWorker` captures frames at configured interval and posts to worker
  - [x] 6.3 Test: posted messages include transferable ArrayBuffer (transfer list contains buffer)
  - [x] 6.4 Test: buffer.byteLength === 0 after transfer (confirms zero-copy transfer occurred)
  - [x] 6.5 Test: stop() clears interval and stops posting
  - [x] 6.6 Test: AC7 — frames dropped while awaiting ACK (awaitingAck blocks subsequent captures)
  - [x] 6.7 Test: frameId resets to 0 on startWithWorker after stop
  - [x] 6.8 Test: multiple startWithWorker calls do not create duplicate intervals (re-entrant safe)

- [x] 7. Create or update states integration tests (AC5)
  - [x] 7.1 Test: Error state terminates worker and capture stops
  - [x] 7.2 Test: Lost state pauses capture but keeps worker alive; subsequent Tracking re-acquisition resumes capture with same worker
  - [x] 7.3 Test: RETRY from Error creates new worker (old worker was terminated)

- [x] 8. Verify existing tests still pass (AC regression)
  - [x] 8.1 Run `npx vitest run` — confirm no regressions in FSM tests, camera tests, scene tests, loader tests, splash tests, loading tests
  - [x] 8.2 Update any test that relied on `onEnter(Camera)` mounting renderer (it still does — just also starts capture)

## Dev Notes

### Frame Capture → Worker Architecture

The existing `FrameCapture` class in `src/camera/frame.ts` already handles OffscreenCanvas capture at `FRAME_CAPTURE_INTERVAL_MS` (33ms). This story adds a `startWithWorker()` method that posts captured frames to the Web Worker via `postMessage` with transferable ArrayBuffers. The capture loop enforces a single in-flight frame safeguard (see AC7) — if a frame is pending ACK, the next tick drops the frame instead of queuing.

```
Camera state onEnter
  → Create Worker (src/worker/index.ts)
  → FrameCapture.startWithWorker(worker)
    → Each tick: capture() → FrameData { width, height, data: ArrayBuffer }
    → Skip if awaitingAck (AC7: single in-flight)
    → postMessage({ type: 'FRAME_DATA', payload: { width, height, data, frameId } }, [data])
    → Worker receives, posts FRAME_ACK back
    → Main thread ACK callback clears awaitingAck flag

Camera state onExit
  → FrameCapture.stop() (stops setInterval)
  → Worker.postMessage({ type: 'TERMINATE' })  // graceful shutdown — worker self-closes
  → Do NOT call worker.terminate() — TERMINATE message + self.close() is sufficient
```

### Worker Creation Pattern

Use Vite's `?worker` import pattern OR dynamic `new Worker(url, { type: 'module' })`:

```typescript
// In states.ts:
const worker = new Worker(
  new URL('../worker/index.ts', import.meta.url),
  { type: 'module' }
)
```

Do NOT use Vite's `?worker` import suffix — it creates a non-testable global. The `new URL` pattern above is Vite-compatible, provides HMR in dev, and allows worker replacement in tests.

### TypeScript strict mode considerations

`noUncheckedIndexedAccess` is enabled — all property accesses return `T | undefined`. Handle explicitly. See [Source: src/config.ts:1-2].

### Existing Code to Preserve

**FrameCapture class (`src/camera/frame.ts`):**
- `capture()` method — returns `FrameData | null`. MUST NOT modify.
- `start(callback)` / `stop()` — used by existing tests. MUST NOT modify signature.
- `#initCanvas()` — OffscreenCanvas with HTMLCanvasElement fallback. MUST NOT modify.
- The class uses `#` private fields (native private fields, not `_` prefix). New methods must follow this pattern.

**states.ts module-level state:**
- `let currentStream: MediaStream | null` — already exists, used by Camera onEnter/onExit
- `let sceneContext: SceneContext | null` — already exists
- `let stopRenderLoopFn: (() => void) | null` — already exists
- Add: `let frameCapture: FrameCapture | null = null`
- Add: `let frameWorker: Worker | null = null`

**Camera onEnter current behavior (states.ts:117-123):**
- Clears container
- Removes opacity transition classes
- Appends renderer.domElement to container
- This story adds: create worker + start capture AFTER renderer mount

**Camera onExit current behavior (states.ts:124-130):**
- Calls `stopRenderLoopFn?.()`
- Calls `stopCameraStream(currentStream)`
- This story adds: stop capture + terminate worker BEFORE stream stop

### Pause/Resume Strategy

The capture loop is active during Camera AND Tracking states — it persists across Camera→Tracking without interruption. The loop only pauses on transitions to Lost or Error:

| Transition | Capture Action | Worker Action |
|---|---|---|
| Camera → Tracking | Keep running (no change) | Keep alive (no change) |
| Camera → Error | Stop capture | Terminate worker |
| Tracking → Lost | Stop capture | Keep alive (re-acquire fast) |
| Lost → Tracking | Resume capture | Re-use existing worker |
| Error → Loading (RETRY) | Stop capture (already stopped) | Terminate stale worker, recreate |

**Lifecycle in context of full FSM flow:**
```
Splash → Loading (no capture) → Camera (start capture) → Tracking (capture persists)
                                                                 ↓
                                                                 Lost (pause capture, keep worker)
                                                                 ↓
                                                            Tracking (resume capture)
```
When transitioning from Camera → Lost (tracking lost but still hoping for re-acquisition):
- Stop the capture loop (no new frames sent)
- Keep the worker alive (don't terminate)
- On re-acquisition (Lost → Tracking), restart capture loop

When going to Error state:
- Stop capture AND terminate worker (clean restart on retry)

### Worker Message Protocol (defined in types/events.ts)

```typescript
// Main Thread → Worker
type WorkerOutboundMessage =
  | { type: 'FRAME_DATA'; payload: { frameId: number; width: number; height: number; data: ArrayBuffer } }
  | { type: 'TERMINATE' }

// Worker → Main Thread
type WorkerInboundMessage =
  | { type: 'WORKER_READY' }
  | { type: 'FRAME_ACK'; payload: { frameId: number } }
  | { type: 'INFERENCE_RESULT'; payload: RawInferenceOutput }  // Epic 2 placeholder
  | { type: 'INFERENCE_ERROR'; payload: { message: string; code: string } }  // Epic 2 placeholder
```

Transfers: `FRAME_DATA` includes `[payload.data]` as transfer list (zero-copy). Do NOT transfer other payload properties.

### FrameId Correlation

Each captured frame gets an incrementing `frameId`. This enables:
- ACK correlation (worker confirms frame received)
- Future backpressure (if ACKs lag, skip frames)
- Debugging dropped frames
- FrameId resets to 0 on `stop()` / `startWithWorker()`

### Architecture Compliance

- **postMessage protocol**: Use transferable ArrayBuffers (NOT structured clone). Transfer list: `[payload.data]`. [Architecture:369-372]
- **Worker creation**: `new Worker(new URL(...), { type: 'module' })` — Vite-compatible. [Architecture:69-70]
- **Naming**: camelCase filenames (`worker/index.ts`, `frame.test.ts`). [Architecture:409]
- **Types**: PascalCase discriminated unions (`WorkerOutboundMessage`, `WorkerInboundMessage`). [Architecture:410]
- **Message type strings**: SCREAMING_SNAKE_CASE (`FRAME_DATA`, `FRAME_ACK`, `WORKER_READY`, `TERMINATE`). [Architecture:419]
- **Private fields**: `#` prefix for class private members (FrameCapture). [Architecture:414]
- **Target**: ES2020 (Web Worker module type is ES2020-compatible). [Architecture:94]
- **Testing**: Vitest with jsdom environment. [Architecture:105-107]
- **Test location**: Co-located `*.test.ts` next to source. [Architecture:394]
- **No external worker libraries**: Vanilla `Worker` API — do NOT add any worker-related dependency. [PRD:114]
- **Error handling**: All worker message handlers wrapped in try/catch. If worker errors, the onEnter(Error) path must handle it. [Architecture:447-451]

### Previous Story Learnings (Story 1.4)

- **FSM constructor doesn't fire onEnter**: The workaround pattern is to handle initial state effects outside the FSM. For this story, `onEnter(Camera)` will fire normally during transitions, so no workaround needed. [Story 1.4:237]
- **TypeScript strict**: `noUncheckedIndexedAccess` is enabled — handle optional chaining on all property accesses. [Story 1.4:238]
- **ESLint unused vars**: Use `import type` for type-only imports. [Story 1.4:239]
- **DOM cleanup**: `onExit` handlers clear `container.innerHTML` — ensure worker refs are nulled before DOM cleanup. [Story 1.4:241]
- **Discriminated union pattern**: Used for parallel results in Loading state. For this story, capture is sequential (not parallel), so Promise.all not needed. [Story 1.4:168-199]
- **No async in onExit**: `onExit()` runs synchronously in `dispatch()`. Worker termination is synchronous, so it's safe. [Story 1.4:280]
- **WASM strategy (Option A)**: ONNX RT WASM files are not fetched in this story. Story 2.1 handles wasmPaths. This story's worker is empty shell (just FRAME_DATA → FRAME_ACK relay). [Story 1.4:278]
- **Placeholder model**: `public/models/statue-model.ort` exists as dummy data. Not relevant to this story. [Story 1.4:283]

### Git Intelligence

Recent commits show consistent pattern of incremental story implementation with tests. Stories 1.2-1.4 followed: implementation → tests → mark done. Each story adds new files and modifies `state/states.ts`. The `states.ts` file is the central orchestration point — every Epic 1 story modifies it. Be careful to preserve existing state transitions while adding new hooks.

### Testing Standards

- **Framework**: Vitest with jsdom environment. [Source: vitest.config.ts]
- **Worker testing**: Use `vi.fn()` to mock `self.postMessage` and `self.close`. Use `vi.stubGlobal` to mock `Worker` constructor for FrameCapture tests. See `src/camera/stream.test.ts` for mocking patterns (lines 10-18).
- **FrameCapture tests**: Create mock Worker with `vi.fn()` postMessage. Call `startWithWorker(mockWorker)` and verify `mockWorker.postMessage` called with correct args and transfer list.
- **DOM tests**: Use jsdom's `document.createElement` for container elements. [Source: src/state/machine.test.ts:157-162]
- **Each AC maps to 1-2 test cases** (see Tasks 5.x, 6.x)

### Known Pitfalls

- **Worker module type**: JSDOM does not support real Workers. Tests must mock the Worker API. Use `vi.stubGlobal('Worker', mockWorkerConstructor)` in test setup.
- **OffscreenCanvas in jsdom**: jsdom doesn't support OffscreenCanvas. The existing FrameCapture already handles this with HTMLCanvasElement fallback (`#initCanvas` checks typeof OffscreenCanvas). In tests, the fallback path will be exercised automatically unless OffscreenCanvas is polyfilled.
- **Transfer list**: If `postMessage` is called without the transfer list, ArrayBuffer will be copied (structured clone) instead of transferred (zero-copy). The transfer list is the third argument: `worker.postMessage(msg, [buffer])`. Missing this violates AC2.
- **Buffer detachment**: After transfer, `buffer.byteLength === 0` on the sender side. Any subsequent read of the buffer will yield an empty buffer. This is normal — transferred buffers become neutered (detached) on the sending side. Never reuse a buffer after transfer.
- **FrameId reset**: On `stop()` followed by `startWithWorker()`, frameId should reset to 0. This is implicit if we re-initialize frameId to 0 in `startWithWorker()`.
- **Worker URI in Vite**: The `new Worker(new URL(...), { type: 'module' })` pattern relies on Vite's static analysis to resolve the worker URL at build time. Do NOT construct the URL dynamically (e.g., with string interpolation) — Vite won't detect it and the worker won't be bundled.
- **Multiple camera onExit calls**: The Camera state can transition to Tracking, Error, or Unsupported. `onExit(Camera)` runs for ALL of these. The stop+terminate logic must be idempotent (guard with null check on `frameWorker`).
- **Retry from Error to Loading**: `onEnter(Loading)` re-runs the parallel model download + camera acquisition. Camera acquisition creates a new video element and stream. The old FrameCapture ref from the previous Camera state is already cleaned up in `onExit(Camera)`. The new Camera state (after Loading→Camera) creates a fresh FrameCapture.
- **Lost state edge case**: When transitioning Lost → Tracking, the worker is still alive (not terminated). `onExit(Lost)` must call `frameCapture.startWithWorker(existingWorker)` to resume. The existing worker still has the same `self.onmessage` handler — no re-init needed.
- **setInterval drift**: At 33ms intervals, Safari timer clamping (~1s in background), GC pauses, and main-thread work can produce uneven capture cadence. This is acceptable for PoC — RAF-based scheduling is deferred to post-PoC optimization.
- **Worker termination duality**: Do NOT both post `TERMINATE` and call `worker.terminate()`. `terminate()` kills the worker immediately — the TERMINATE message may never process. Use TERMINATE + `self.close()` only (graceful shutdown).

## Dev Agent Record

### Agent Model Used

opencode/deepseek-v4-flash-free

### Debug Log References

- Story 1.5 design decisions:
  - Worker creation uses `new Worker(new URL(...))` pattern (not `?worker` import) for testability and Vite compatibility.
  - FrameCapture gets `startWithWorker()` rather than modifying existing `start()` — preserves backward compatibility with existing tests.
  - FrameId counter enables ACK correlation and future backpressure. Resets on `stop()`.
  - Single in-flight safeguard (`#awaitingAck` flag) prevents unbounded queue growth — frames dropped while pending ACK.
  - Graceful worker shutdown: `TERMINATE` message + `self.close()` only. No `worker.terminate()` — avoids race between message and kill.
  - Pause/resume strategy distinguishes Lost (keep worker, capture persists through Tracking) from Error (terminate worker, clean restart) based on recovery semantics.
  - `INFERENCE_RESULT` and `INFERENCE_ERROR` message types are defined as placeholders for Epic 2 workers — no processing logic in this story.
  - Transfer list is `[data]` (the ArrayBuffer) — not the entire payload object. Only transferable objects go in the list.
  - Buffer becomes detached (byteLength === 0) after transfer; never reuse the originating buffer.
  - setInterval cadence is intentional for PoC — RAF-based scheduling deferred to post-PoC optimization.
  - Worker accepts FRAME_DATA immediately on boot — no gating on WORKER_READY.

### Completion Notes List

- Task 1: Added `WorkerOutboundMessage`, `WorkerInboundMessage` discriminated unions to `src/types/events.ts`
- Task 2: Created `src/worker/index.ts` with WORKER_READY, FRAME_ACK relay, TERMINATE handling, and `createWorkerHandler()` factory
- Task 3: Added `startWithWorker(worker, onAck?)` to `src/camera/frame.ts` with frameId counter
- Task 4: Modified `src/state/states.ts` — Camera onEnter creates worker + starts capture, Camera onExit stops + terminates, Error onEnter pauses, Lost onEnter pauses, Lost onExit resumes
- Task 5: Created `src/worker/index.test.ts` — 5 tests covering WORKER_READY, FRAME_ACK, TERMINATE, never assertion
- Task 6: Created `src/camera/frame.test.ts` — 8 tests covering capture interval, postMessage with transfer, buffer detachment, stop clears interval, AC7 single-in-flight drop, frameId increment, multiple startWithWorker safety
- Task 7: Created states integration tests — Error terminates worker, Lost keeps worker alive, RETRY creates new worker
- Task 8: Full test suite passes — no regressions

### File List

- `src/types/events.ts` — MODIFIED (added WorkerOutboundMessage, WorkerInboundMessage types)
- `src/types/index.ts` — MODIFIED (re-export new worker message types)
- `src/worker/index.ts` — NEW (Web Worker entry point)
- `src/worker/index.test.ts` — NEW (Worker tests)
- `src/camera/frame.ts` — MODIFIED (added startWithWorker method)
- `src/camera/frame.test.ts` — NEW (FrameCapture integration tests)
- `src/state/states.ts` — MODIFIED (wired worker lifecycle to FSM hooks)

## Suggested Review Order

**Worker Message Protocol**

  Discriminated unions define the type-safe contract between main thread and Web Worker
  [`events.ts:74`](../../src/types/events.ts#L74)

  Re-exported for consumer convenience
  [`index.ts:2`](../../src/types/index.ts#L2)

**Web Worker Implementation**

  Handler factory dispatches FRAME_DATA → FRAME_ACK relay and handles graceful TERMINATE shutdown
  [`index.ts:8`](../../src/worker/index.ts#L8)

  Worker boot auto-posts WORKER_READY and registers handler — guarded against non-worker scopes
  [`index.ts:34`](../../src/worker/index.ts#L34)

**Frame Capture Pipeline**

  startWithWorker posts captured frames as transferable ArrayBuffers with single in-flight (`#awaitingAck`) guard
  [`frame.ts:55`](../../src/camera/frame.ts#L55)

  onFrameAck clears the awaiting flag, allowing the next capture tick to proceed
  [`frame.ts:74`](../../src/camera/frame.ts#L74)

**FSM Lifecycle Wiring**

  Camera onEnter creates the Worker and starts the capture loop after renderer mount
  [`states.ts:128`](../../src/state/states.ts#L128)

  Camera onExit preserves worker+stream for Tracking; terminates both for Error/other transitions
  [`states.ts:149`](../../src/state/states.ts#L149)

  Lost onEnter pauses capture (worker stays alive); Lost onExit resumes only on re-acquisition (Lost→Tracking)
  [`states.ts:172`](../../src/state/states.ts#L172)

  Error onEnter terminates the worker for clean restart on retry
  [`states.ts:182`](../../src/state/states.ts#L182)

**Tests**

  Worker handler unit tests with injectable scope for isolation
  [`index.test.ts:8`](../../src/worker/index.test.ts#L8)

  FrameCapture integration: transfer list, buffer detachment, single in-flight, re-entrant safety
  [`frame.test.ts:49`](../../src/camera/frame.test.ts#L49)

  FSM integration: worker termination on Error, preservation on Lost, re-creation on RETRY
  [`machine.test.ts:340`](../../src/state/machine.test.ts#L340)
