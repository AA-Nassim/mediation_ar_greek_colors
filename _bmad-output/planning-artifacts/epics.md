---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# mediation_ar_greek_colors - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for mediation_ar_greek_colors, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Visitor can grant or deny camera access via browser permission prompt
FR2: System can access the rear-facing camera stream via getUserMedia
FR3: System can capture individual frames from the camera stream for inference
FR4: System can detect the target Greek marble statue in a live camera frame
FR5: System can estimate 6DoF pose (position + orientation) of the detected statue
FR6: System can maintain tracking as the user moves the camera around the statue
FR7: System can re-acquire tracking if the statue leaves and re-enters the frame
FR8: System can render a colored 3D replica overlay aligned with the real statue's pose
FR9: Overlay updates in real-time as tracking updates (6DoF synchronization)
FR10: Overlay fades gracefully when tracking is lost
FR11: System can download and cache the trained recognition model and WASM runtime
FR12: System can initialize the ONNX Runtime Web inference session
FR13: System can run as a standalone PWA (manifest.json, fullscreen display)
FR14: Visitor sees a loading indicator during model download and initialization
FR15: Visitor receives visual feedback when recognition is acquired (tracking locked)
FR16: Visitor receives visual feedback when tracking is lost
FR17: Visitor can access the experience via a URL or QR code — no install required

### NonFunctional Requirements

NFR1: End-to-end inference pipeline (frame capture → preprocessing → ONNX inference → pose estimation → render) completes within 100ms per cycle on target mid-range device
NFR2: 6DoF overlay updates at minimum 15 fps during active tracking
NFR3: Initial model and WASM runtime load completes within 10 seconds on standard museum WiFi
NFR4: Re-acquisition of a lost track completes within 3 seconds of statue re-entering frame
NFR5: First-frame statue recognition from cold start (camera permission granted) completes within 5 seconds

### Additional Requirements

- Starter template: Vite vanilla-ts — scaffold project via `npm create vite@latest` as first implementation story
- Nginx custom.conf configuration for WASM MIME types (`application/wasm`), optional COOP/COEP headers
- Docker setup (nginx:alpine) for deployment with custom Nginx config mounted
- Static hosting via Docker/Nginx (self-hosted or platform like Coolify)
- Vitest for testing with jsdom environment
- ESLint + @typescript-eslint (flat config) for linting
- GLB with Draco compression (KHR_draco_mesh_compression via THREE.DRACOLoader) for 3D overlay model
- postMessage protocol with transferable ArrayBuffers (not structured clone) for Main Thread ↔ Web Worker
- Vite manualChunks to split Three.js and ONNX Runtime Web into separate cacheable chunks
- No backend, no database — fully client-side architecture
- Target: iOS Safari + Android Chrome (latest 2 major versions)
- Device tier detection and adaptive quality — deferred to post-PoC; fixed WASM-only configuration for initial implementation

### UX Design Requirements

None — no UX Design document exists for this project.

### FR Coverage Map

FR1: Epic 1 - Camera access via browser permission prompt
FR2: Epic 1 - Rear-facing camera stream via getUserMedia
FR3: Epic 1 - Frame capture from camera stream for inference
FR4: Epic 2 - Target statue detection in live camera frame
FR5: Epic 2 - 6DoF pose estimation of detected statue
FR6: Epic 2 - Tracking maintenance as camera moves around statue
FR7: Epic 2 - Tracking re-acquisition if statue leaves and re-enters frame
FR8: Epic 2 - Colored 3D replica overlay aligned with statue pose
FR9: Epic 2 - Real-time overlay updates with 6DoF synchronization
FR10: Epic 2 - Graceful overlay fade when tracking is lost
FR11: Epic 1 - Download and cache recognition model and WASM runtime
FR12: Epic 2 - ONNX Runtime Web inference session initialization
FR13: Epic 3 - Standalone PWA with manifest.json and fullscreen display
FR14: Epic 1 - Loading indicator during model download and initialization
FR15: Epic 2 - Visual feedback when recognition is acquired
FR16: Epic 2 - Visual feedback when tracking is lost
FR17: Epic 3 - URL/QR code access, no install required

## Epic List

### Epic 1: Foundation & Camera Experience
Visitor can open the app, grant camera permission, see the live camera preview with loading progress as the model downloads into a ready Three.js scene.
**FRs covered:** FR1, FR2, FR3, FR11, FR14

### Epic 2: Statue Recognition & AR Overlay
Visitor points camera at the Greek marble statue and the colored 3D replica appears overlaid, tracking in real-time as they move around the exhibit.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR12, FR15, FR16

### Epic 3: Polish & Deployment
Visitor gets a polished PWA experience with offline caching and the app is deployed to production via Docker/Nginx.
**FRs covered:** FR13, FR17

## Epic 1: Foundation & Camera Experience

Visitor can open the app, grant camera permission, see the live camera preview with loading progress as the model downloads into a ready Three.js scene.

### Story 1.1: Project Scaffold & Build Configuration

As a developer,
I want a scaffolded Vite vanilla-ts project with Tailwind CSS v4, TypeScript strict mode, Vitest, ESLint, and all dependencies installed,
So that I can begin implementing the AR experience with proper build tooling.

**Acceptance Criteria:**

**Given** the project directory does not exist
**When** I run `npm create vite@latest mediation-ar-greek-colors -- --template vanilla-ts`
**Then** a fully scaffolded project is created with TypeScript, Vite config, and `index.html`

**Given** the scaffolded project
**When** I install dependencies (three, onnxruntime-web, tailwindcss, @tailwindcss/vite, vitest, eslint, vite-plugin-static-copy)
**Then** `package.json` lists all required dependencies with correct versions

**Given** the installed dependencies
**When** TypeScript strict mode is enabled with `noUncheckedIndexedAccess`
**Then** `tsconfig.json` has strict rules configured

**Given** the configured project
**When** I run `npm run dev`
**Then** the Vite dev server starts without errors and serves the app at a local URL

**Given** the configured project
**When** I run `npx vitest run`
**Then** the test runner executes and reports zero failures

**Given** the configured project
**When** I run `npm run build`
**Then** Vite produces an optimized production build in `dist/` and exits with code 0

### Story 1.2: Typed State Machine & App Orchestration

As a developer,
I want a typed finite state machine managing the 7 app states (splash, loading, camera, tracking, lost, error, unsupported) with strict transition guards,
So that the app's boot sequence, camera pipeline, inference, and overlay are orchestrated in a predictable, testable way.

**Acceptance Criteria:**

**Given** the project scaffold exists
**When** I implement the StateMachine generic interface `StateMachine<S, E>` with typed state enums, event enums, and transition guards
**Then** the FSM enforces that only valid transitions are allowed at compile time
**And** shared types for state enums and event types are defined in `src/types/events.ts`

**Given** the app boots
**When** the page loads
**Then** the FSM initializes in the `splash` state

**Given** the state is `splash`
**When** the Three.js renderer and scene are ready
**Then** the FSM transitions to `loading` via a `RENDERER_READY` event

**Given** the state is `loading`
**When** the model and WASM runtime finish downloading and the camera stream is acquired
**Then** the FSM transitions to `camera` via a `MODEL_LOADED` event

**Given** the state is `camera`
**When** the ONNX inference pipeline returns a successful detection
**Then** the FSM transitions to `tracking` via a `STATUE_DETECTED` event

**Given** the state is `camera`
**When** the camera feed is live and the FSM is waiting for a detection
**Then** a subtle "scanning" pulse or ring animation is displayed on screen to indicate that recognition is active

**Given** the state is `tracking`
**When** tracking confidence drops below threshold for N consecutive frames
**Then** the FSM transitions to `lost` via a `TRACKING_LOST` event

**Given** the state is `lost`
**When** the statue is re-detected in the frame
**Then** the FSM transitions back to `tracking` via a `STATUE_REACQUIRED` event

**Given** any state
**When** an unrecoverable error occurs (camera denied, WebGL unsupported, WASM load failure)
**Then** the FSM transitions to `error` via a `FATAL_ERROR` event, displaying a retry UI

**Given** the device lacks required capabilities (no WebGL, no Web Worker support)
**When** a capability check fails on init
**Then** the FSM transitions to `unsupported` (terminal state) with a message explaining why

**Given** the FSM is fully implemented with onEnter/onExit lifecycle hooks
**When** each state transition fires
**Then** the corresponding UI module is mounted (onEnter) and previous UI is cleaned up (onExit)

### Story 1.3: Camera Permission & Live Preview with Camera Feed as Scene Background

As a visitor,
I want to grant camera permission and see the rear-facing camera feed displayed as the background of a Three.js scene,
So that I can point my phone at the statue and the app is ready to overlay the colored replica.

**Acceptance Criteria:**

**Given** the app is loaded on a mobile device with a rear-facing camera
**When** the app requests camera access
**Then** the browser permission prompt is shown asking the visitor to Allow or Deny camera access

**Given** the visitor taps Allow on the permission prompt
**When** getUserMedia is called with `facingMode: { ideal: 'environment' }` constraints
**Then** the rear-facing camera stream is acquired and starts playing in a hidden `<video>` element

**Given** the camera stream is active and the model download completes (from Story 1.4)
**When** the Three.js scene is initialized with a PerspectiveCamera and WebGLRenderer
**Then** the renderer is attached to the page's DOM and the camera feed is rendered as a textured background plane in the scene

**Given** the app is in the `splash` or `loading` state
**When** camera acquisition begins
**Then** the stream is acquired in parallel with model download (no need to wait for Three.js to be ready)

**Given** camera permission was denied
**When** the app detects the permission error
**Then** a user-friendly error message is displayed explaining that camera access is required, with a retry button

**Given** the device has no rear-facing camera
**When** getUserMedia fails with OverconstrainedError
**Then** the app falls back to any available camera or displays an unsupported device message

### Story 1.4: Splash Screen & Three.js Boot with Model Download Progress

As a visitor,
I want to see a splash screen on cold start and a loading progress indicator while the recognition model and WASM runtime download,
So that I understand the app is initializing and know how long to wait.

**Acceptance Criteria:**

**Given** the app is opened for the first time (cold cache)
**When** the page loads
**Then** a branded splash screen is displayed immediately with the app name and a brief "Preparing AR experience..." message

**Given** the splash screen is visible
**When** the Three.js scene and WebGLRenderer initialize in the background
**Then** the splash screen updates to show a progress state once the renderer is ready

**Given** the renderer is ready
**When** the recognition model `.ort` file and ONNX WASM runtime binaries begin downloading
**Then** a progress bar or percentage indicator shows download status, updating as chunks arrive

**Given** the download completes
**When** the model and WASM runtime are fully cached
**Then** the splash screen transitions to the camera preview with a smooth fade-out animation

**Given** the download fails due to network error
**When** the fetch request throws
**Then** an error screen is displayed with a Retry button

### Story 1.5: Responsive Frame Capture Pipeline

As a developer,
I want camera frames captured via OffscreenCanvas and transferred to a Web Worker as ArrayBuffers,
So that the camera feed stays responsive and inference runs off the main thread.

**Acceptance Criteria:**

**Given** the camera stream is active and the Three.js scene is running
**When** a frame capture loop starts
**Then** individual frames are drawn to an OffscreenCanvas at a configurable cadence (e.g. 30fps target)

**Given** a frame is captured on the OffscreenCanvas
**When** the canvas pixels are extracted as an ArrayBuffer
**Then** the buffer is transferred via `postMessage({ type: 'FRAME_DATA', payload: buffer }, [buffer])` to the Web Worker (zero-copy transfer)

**Given** the Web Worker receives the FRAME_DATA message
**When** `self.onmessage` is dispatched
**Then** the worker acknowledges receipt and the main thread can continue capturing the next frame without waiting for inference to complete

**Given** the Web Worker is initialized
**When** the worker boots
**Then** it enters a ready state and accepts FRAME_DATA messages (ONNX session initialization is handled in a later story)

**Given** the capture loop is running
**When** the app transitions to an error or lost state
**Then** the capture loop pauses (frames stop being sent to the worker) and resumes when the appropriate state re-enters

## Epic 2: Statue Recognition & AR Overlay

Visitor points camera at the Greek marble statue and the colored 3D replica appears overlaid, tracking in real-time as they move around the exhibit.

### Story 2.1: ONNX Inference Pipeline

As a developer,
I want the Web Worker to preprocess frames and run the recognition model through ONNX Runtime Web,
So that the statue's position and orientation can be estimated from the camera feed entirely on-device.

**Acceptance Criteria:**

**Given** the model paths, WASM URLs, and FPS thresholds are defined in `src/config.ts`
**When** the worker initializes the ONNX session
**Then** it reads the `.ort` model path and WASM runtime paths from this config module

**Given** the Web Worker receives a FRAME_DATA ArrayBuffer
**When** the `preprocess.ts` module processes the raw pixels
**Then** the frame is resized to the model's expected input dimensions, normalized to [0,1], and laid out in NCHW format

**Given** a preprocessed tensor is ready
**When** `inference.ts` calls `session.run()` on the ONNX Runtime Web session
**Then** inference executes using the WASM backend (fixed backend for PoC; device-tier adaptation is post-PoC)

**Given** inference completes
**When** the raw output tensor is received
**Then** it is serialized and posted back to the main thread as `{ type: 'INFERENCE_RESULT', payload: RawInferenceOutput }`
**And** shared inference output types are defined in `src/types/index.ts`

**Given** the ONNX model file is loaded
**When** the worker initializes the session
**Then** it uses the `.ort` compact format model from `public/models/statue-model.ort` with `executionProviders: ['wasm']`

**Given** inference fails (model load error, runtime error)
**When** the error is caught
**Then** the worker posts `{ type: 'INFERENCE_ERROR', payload: { message, code } }` to the main thread

### Story 2.2: Pose Estimation & 6DoF Tracking

As a visitor,
I want the app to estimate the statue's position and orientation from the inference output and maintain tracking as I move around,
So that the overlay stays aligned with the real statue from any angle.

**Acceptance Criteria:**

**Given** the main thread receives an INFERENCE_RESULT from the Web Worker
**When** `registration.ts` processes the raw output
**Then** it maps the 2D inference data to a 3D `PoseData` object containing position (Vector3) and orientation (Quaternion) in world coordinates
**And** `PoseData` type is defined in `src/types/pose.ts`

**Given** a PoseData object is produced
**When** `tracker.ts` receives it
**Then** it applies smoothing/filtering (e.g., exponential moving average) to reduce jitter between consecutive frames

**Given** tracking is active and the user moves the camera around the statue
**When** each new filtered pose arrives
**Then** the tracker updates the current pose and feeds it to the renderer at the target cadence (minimum 15fps per NFR2)

**Given** tracking confidence drops below threshold for N consecutive frames
**When** the tracker detects potential tracking loss
**Then** it emits a `TRACKING_LOST` event to the FSM and the system enters the `lost` state

**Given** the system is in `lost` state
**When** a new inference result arrives with confidence above threshold
**Then** the tracker emits a `STATUE_REACQUIRED` event and the system transitions back to `tracking`

**Given** the camera is calibrated
**When** `calibration.ts` computes the projection matrix from device camera parameters
**Then** the pose is adjusted for correct perspective alignment between the 3D overlay and the real-world statue

> **Note:** Mobile browsers do not reliably expose camera intrinsics (focal length). For the PoC, accept an estimated FOV-based pinhole model. Full device-specific calibration is post-PoC.

### Story 2.3: Three.js AR Overlay with Colored Replica

As a visitor,
I want the colored 3D replica of the statue to appear overlaid on the real marble statue and track smoothly as I move,
So that I can see the statue's original painted appearance from every angle.

**Acceptance Criteria:**

**Given** the FSM enters the `tracking` state
**When** the first valid pose is received from the tracker
**Then** the Draco-compressed GLB overlay model is loaded from `public/models/overlay-model.glb` using Three.js DRACOLoader

**Given** the GLB model is loaded and the tracker provides PoseData
**When** `ar-mesh.ts` receives the pose
**Then** it positions and orients the 3D mesh group in Three.js world space matching the statue's 6DoF pose

**Given** the overlay is rendered
**When** new pose updates arrive from the tracker
**Then** the mesh position and rotation are updated each animation frame, maintaining alignment with the real statue in real-time

**Given** the FSM transitions to `lost` state
**When** tracking is lost
**Then** the overlay opacity fades to zero over ~500ms

**Given** the FSM transitions back to `tracking` (re-acquisition)
**When** a new pose is received
**Then** the overlay fades back to full opacity over ~300ms

## Epic 3: Polish & Deployment

Visitor gets a polished PWA experience with offline caching and the app is deployed to production via Docker/Nginx.

### Story 3.1: PWA Manifest & Service Worker Caching

As a visitor,
I want the app to install as a standalone PWA with offline-capable caching,
So that I can access the experience from my home screen without an app store and it loads quickly on repeat visits.

**Acceptance Criteria:**

**Given** the scaffolded project
**When** I inspect the page source
**Then** a `manifest.json` exists with `display: standalone`, `orientation: portrait`, `name`, `short_name`, `start_url`, and `icons` (at minimum 192x192 and 512x512)

**Given** the app is served
**When** the browser loads the page
**Then** the `<link rel="manifest">` tag is present in `index.html` and the browser triggers the `beforeinstallprompt` event

**Given** a Service Worker is registered
**When** the SW install event fires
**Then** it precaches the app shell (index.html, main JS entry, CSS) and model/WASM asset paths are configured for lazy caching

**Given** the recognition model `.ort` file and ONNX WASM runtime are fetched
**When** the Service Worker intercepts the fetch
**Then** they are cached with a cache-first strategy keyed by model version hash

**Given** a new model version is deployed with a different version hash
**When** the SW activate event fires
**Then** it invalidates and removes stale model caches, keeping only the current version

### Story 3.2: Docker/Nginx Production Deployment

As a developer,
I want the app deployed to production via a Docker Nginx container configured for WASM MIME types, optional COOP/COEP headers, and static asset caching,
So that the AR experience is publicly accessible and all browser requirements are met.

**Acceptance Criteria:**

**Given** the project is production-ready
**When** I run `vite build`
**Then** an optimized production build is produced in the `dist/` directory with Three.js and ONNX Runtime Web in separate cacheable chunks

**Given** the build output exists
**When** the Dockerfile builds the Nginx container
**Then** it uses `nginx:alpine`, copies `dist/` to the Nginx html root, and mounts `infra/nginx/custom.conf`

**Given** the custom.conf is mounted
**When** Nginx starts
**Then** the `application/wasm` MIME type is registered, `.wasm` files have `Cache-Control: public, immutable, max-age=31536000`, and `.ort` files have `Cache-Control: public, immutable, max-age=86400`

**Given** multi-threaded WASM is desired (enables SharedArrayBuffer for faster transfer)
**When** Nginx starts
**Then** optional COOP: `same-origin` and COEP: `require-corp` headers are set on page load

**Given** the Docker container is running
**When** I run `infra/verify.sh`
**Then** it confirms: `Content-Type: application/wasm` on `.wasm` files, COOP/COEP headers present if configured, no HTTPS warnings for getUserMedia, and the FSM error state is reachable showing a retry UI

**Given** the app is deployed
**When** I open the public URL on a mobile device
**Then** the app loads over HTTPS, camera access works, and the full AR experience is functional

**Given** multi-threaded WASM is used
**When** the page loads
**Then** COOP/COEP headers are present (enabling SharedArrayBuffer) and no cross-origin isolation warnings appear in DevTools; if single-threaded WASM fallback is active, these headers are omitted
