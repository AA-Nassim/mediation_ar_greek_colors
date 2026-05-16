---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-16'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/research/technical-3d-object-recognition-from-photogrammetry-for-mobile-web-ar-research-2026-05-15.md'
workflowType: 'architecture'
project_name: 'mediation_ar_greek_colors'
user_name: 'SharkiShark'
date: '2026-05-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (17 total):**
- *Camera & Permissions (FR1-FR3):* Browser-based camera access via getUserMedia, rear-facing, frame capture for inference
- *Object Recognition & Tracking (FR4-FR7):* Single statue detection, 6DoF pose estimation, continuous tracking, re-acquisition on tracking loss
- *AR Overlay (FR8-FR10):* Aligned colored 3D replica rendering, real-time pose sync, graceful fade on tracking loss
- *Loading & Initialization (FR11-FR13):* Model/WASM download & caching, ONNX Runtime session init, PWA standalone mode
- *User Experience (FR14-FR17):* Loading indicators, tracking status feedback, URL/QR access, no install required

**Non-Functional Requirements:**
- NFR1: 100ms end-to-end inference cycle (capture → preprocess → infer → pose → render)
- NFR2: Minimum 15fps overlay updates during active tracking
- NFR3: Model + WASM load within 10s on museum WiFi
- NFR4: Re-acquisition within 3s of statue re-entering frame
- NFR5: First-frame recognition within 5s from cold start

### Scale & Complexity
- **Primary domain:** Mobile Web AR (client-side ML inference + 3D rendering)
- **Complexity level:** Medium — novel ML pipeline with demanding real-time constraints, but single-object, single-release, solo developer
- **Estimated architectural components:** 6 (Camera Pipeline, Inference Worker, Pose Tracker, 3D Renderer, Service Worker Cache, PWA Shell)

### Technical Constraints & Dependencies
- Zero server — fully client-side architecture
- Cross-target: iOS Safari + Android Chrome (latest 2 major versions)
- ONNX Runtime Web (WASM universal, WebGPU where available)
- Three.js for 3D overlay rendering
- Web Worker + OffscreenCanvas for off-main-thread inference
- Service Worker for model/WASM caching
- COOP/COEP headers optional (single-threaded WASM fallback avoids need)
- Model training pipeline (Polycam → WebAR.rocks.train or custom DINOv2)
- Static hosting (Vercel/Netlify/Cloudflare Pages)

### Cross-Cutting Concerns Identified
- **Adaptive quality tiers:** Device capability detection drives inference backend, resolution, and cadence (3 tiers identified in research)
- **Frame transfer protocol:** Zero-copy ArrayBuffer transfer between Main Thread and Web Worker
- **Service Worker cache strategy:** Lazy-load model weights and WASM runtime on camera permission grant
- **Cross-origin isolation:** COOP/COEP headers required for multi-threaded WASM; graceful fallback to single-threaded

## Starter Template Evaluation

### Primary Technology Domain
Mobile Web AR (client-side PWA) based on project requirements analysis

### Starter Options Considered
- **Vite vanilla-ts** (recommended): Minimal TypeScript scaffold, no framework overhead, full control over Web Worker and Service Worker setup
- **Vite react-ts**: Unnecessary React overhead for a camera-feed AR app with minimal UI
- **Vite lit-ts**: Interesting alternative but Web Component ecosystem less mature for complex 3D integration

### Selected Starter: Vite vanilla-ts

**Rationale for Selection:**
- No framework needed — the app is primarily a camera feed + 3D overlay with minimal UI controls
- Vite 8 provides fast HMR, first-class TypeScript support, and built-in Web Worker support via `?worker` import suffix
- Rolldown bundler (Vite 8) enables sub-second production builds critical for rapid iteration
- Full control over Service Worker registration and manifest.json for PWA compliance

**Initialization Command:**
```bash
npm create vite@latest mediation-ar-greek-colors -- --template vanilla-ts
```

**Technology Stack:**
- **Language & Runtime:** TypeScript (strict mode) + Vite 8 (Node.js 20+)
- **3D Rendering:** Three.js r184
- **ML Inference:** ONNX Runtime Web 1.26.0 (WASM + optional WebGPU)
- **Bundler:** Vite 8 with Rolldown (Rust-based), fallback to Vite 7 if worker build path fails
- **Testing:** Vitest (Vite-native, zero-config)
- **Linting:** ESLint + @typescript-eslint (flat config)
- **Static asset copy:** vite-plugin-static-copy for ONNX model `.ort` file deployment
- **Styling:** Tailwind CSS v4 (@tailwindcss/vite plugin)

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript with strict mode enabled
- ESModule imports throughout
- Target: ES2020 (broad mobile browser support)

**Build Tooling:**
- Vite 8 with Rolldown bundler (Rust-based)
- Pin fallback to Vite 7 if worker/ONNX binary bundling is unstable
- TypeScript via esbuild for type stripping during dev
- vite-plugin-static-copy for ONNX model `.ort` and WASM runtime deployment
- Asset handling for GLB models as static assets

**Testing Framework:**
- Vitest configured (Vite-native test runner)
- jsdom environment for DOM-dependent tests

**Code Organization:**
```
src/
├── main.ts              # Entry point, PWA init, camera setup
├── worker/
│   ├── inference.ts     # ONNX Runtime Web session + inference
│   └── preprocess.ts    # Frame capture, resize, normalize
├── render/
│   ├── scene.ts         # Three.js scene, camera, lights
│   ├── overlay.ts       # 3D model positioning from pose
│   └── adaptive.ts      # Device tier detection
├── ar/
│   ├── tracker.ts       # Pose integration
│   └── calibration.ts   # Camera calibration
├── sw/
│   └── service-worker.ts
├── vite-env.d.ts
└── main.ts
```

**Development Experience:**
- Vite dev server with HMR (Web Worker HMR requires full reload)
- TypeScript strict mode with `noUncheckedIndexedAccess`
- Source maps for Worker debugging
- `vite build` produces optimized production bundle with code splitting

### Loading Sequence (Progressive States)
- **Step 1:** Static splash screen displayed immediately on cold start
- **Step 2:** Camera preview starts via getUserMedia while model downloads in background
- **Step 3:** ONNX Runtime Web initializes in Web Worker
- **Step 4:** Three.js boots, renders camera as background
- **Step 5:** Recognition active — overlay ready indicator shown
- Each step reports progress so the user perceives speed even on cold cache

### Technical Risks Addressed
- **Rolldown + Worker bundling:** Vite 7 pinned as fallback; test worker build path before committing
- **Transferable frame protocol:** Use `ArrayBuffer` transfer via `postMessage` (not structured clone) between Main Thread and Web Worker preemptively; `SharedArrayBuffer` with COOP/COEP headers only if transfer becomes a bottleneck
- **Service Worker model versioning:** Cache key includes model version hash; SW checks version on activate and invalidates stale model caches to prevent silent color mapping errors

**Note:** Project initialization using the command above should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Hosting platform: Dedicated server via Coolify (self-hosted Docker)
- 3D model format: GLB with Draco compression (DRACOLoader + WASM decoder)
- State management: Vanilla TypeScript finite-state machine (no library)

**Important Decisions (Shape Architecture):**
- Main Thread ↔ Web Worker protocol: postMessage with transferable ArrayBuffers
- Service Worker cache strategy: Cache-first with model version hash invalidation
- Vite code splitting (manualChunks) to separate Three.js and ONNX Runtime Web chunks
- Tailwind CSS v4 for UI state styling (loading, error, tracking acquisition/loss)

**Deferred Decisions (Post-MVP):**
- Multi-artifact recognition support
- Battery-aware throttling
- Model integrity SHA-256 hash verification

### Data Architecture
- **3D model format:** GLB with Draco compression (KHR_draco_mesh_compression via Three.js DRACOLoader)
- **Model storage:** Static assets served alongside app bundle (public/models/)
- **ONNX model format:** .ort compact format for WASM payload reduction
- **No server-side database** — fully client-side architecture
- **3D model loading:** Lazy-loaded GLB — load ML model first, then fetch Draco-compressed GLB once `tracking` state is entered

### Infrastructure & Deployment
- **Hosting:** Dedicated server with Coolify (Docker-based deployment)
- **WASM MIME types:** Must add custom Nginx snippet for `application/wasm` (ONNX + Draco decoders both load .wasm)
- **COOP/COEP headers:** Required for ONNX multi-threaded WASM path (SharedArrayBuffer)
- **Deployment:** Static site build via `vite build`, served via Coolify Nginx container
- **Environment config:** None required (no backend environment variables)
- **CDN:** Optional — Coolify can front with Cloudflare for edge WASM delivery
- **Docker config:** Single `nginx:alpine` container, mount dist + custom Nginx config

### Coolify Nginx Configuration Required
```nginx
# custom.conf — must be mounted into Nginx container
types {
    application/wasm wasm;
}
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
location ~* \.wasm$ {
    add_header Cache-Control "public, immutable, max-age=31536000";
    add_header Content-Type application/wasm;
}
location ~* \.ort$ {
    add_header Cache-Control "public, immutable, max-age=86400";
}
```

**Deploy acceptance criteria:**
- `curl` confirms `Content-Type: application/wasm` on .wasm files
- COOP/COEP headers present on page load
- No getUserMedia HTTPS warnings in DevTools
- FSM error state reachable and shows retry UI

### Authentication & Security
- **Authentication:** None — no user accounts, no data persistence
- **Security:** Camera permission via user gesture (browser-enforced), all inference on-device
- **Model integrity:** SHA-256 hash verification deferred (not required for PoC)

### API & Communication Patterns
- **No backend API** — fully client-side architecture
- **Inter-thread protocol:** postMessage with transferable ArrayBuffers (not structured clone)
- **Service Worker:** Cache-first for static assets + model/WASM binaries; network-first fallback with version hash check

### Frontend Architecture
- **State machine:** 6 states (splash → loading → camera → tracking → lost → error)
- **Typed StateMachine interface:** Generic `<S, E>` with strict transition guards, typed events, onEnter/onExit hooks
- **UI layer:** Minimal DOM overlay with Tailwind CSS v4 utility classes
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin — `@import "tailwindcss"` in main CSS
- **Use case for Tailwind:** Loading indicators, error screens, camera permission prompt, tracking acquisition/loss UI, splash screen
- **No routing** — single-screen PWA
- **No component library** — utility classes only for minimal custom UI
- **Performance optimization:** 3-tier adaptive quality system based on device capability detection
- **Build optimization:** Vite manualChunks to split Three.js and ONNX Runtime Web into separate cacheable chunks

### Decision Impact Analysis

**Implementation Sequence:**
1. Vite vanilla-ts scaffold + Tailwind CSS setup (build tooling)
2. Nginx custom.conf configuration on Coolify (infrastructure)
3. Typed StateMachine implementation (state management)
4. Service Worker with versioned caching (asset delivery)
5. Camera pipeline + Web Worker (core recognition)
6. Three.js scene with Draco GLB loader (rendering)
7. FSM integration: state wiring, error handling, progressive loading

**Cross-Component Dependencies:**
- WASM MIME config on Coolify blocks all .wasm-dependent features (ONNX, Draco, threaded workers)
- StateMachine error state must be wired before camera pipeline goes live
- Service Worker must register before model/WASM download
- Tailwind styles are independent — can be developed in parallel

## Project Structure & Boundaries

### Complete Project Directory Structure
```
mediation-ar-greek-colors/
├── index.html
├── manifest.json                    # PWA manifest
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── vite.config.ts
├── .gitignore
├── README.md
├── src/
│   ├── main.ts                      # Entry: boot sequence comment (splash → camera → model → track → overlay)
│   ├── config.ts                    # Central config: model paths, WASM URLs, FPS thresholds, tier params
│   ├── style.css                    # @import "tailwindcss"
│   ├── vite-env.d.ts
│   ├── types/
│   │   ├── index.ts                 # Shared type exports
│   │   ├── pose.ts                  # PoseData, Quaternion, Vector3
│   │   ├── events.ts               # FSM event types & Web Worker message types
│   │   └── device.ts                # DeviceTier, CapabilityResult
│   ├── state/
│   │   ├── index.ts                 # Barrel export: public FSM API
│   │   ├── machine.ts               # Typed StateMachine<S, E> generic runner
│   │   ├── states.ts                # State enum, transition table, guard fns
│   │   └── machine.test.ts
│   ├── camera/
│   │   ├── stream.ts                # getUserMedia setup, constraints, permission
│   │   ├── frame.ts                 # Continuous frame capture via OffscreenCanvas
│   │   └── stream.test.ts
│   ├── worker/
│   │   ├── index.ts                 # Worker entry: self.onmessage bootstrap
│   │   ├── inference.ts             # ONNX Runtime Web session + run()
│   │   ├── preprocess.ts            # Frame resize, normalize, NCHW
│   │   ├── inference.test.ts
│   │   └── preprocess.test.ts
│   ├── render/
│   │   ├── scene.ts                 # Three.js scene, camera, lights, renderer
│   │   ├── ar-mesh.ts               # GLB model loading + positioning from 6DoF pose
│   │   ├── adaptive.ts              # DeviceTier → resolution/cadence/backend
│   │   └── scene.test.ts
│   ├── ar/
│   │   ├── tracker.ts               # Pose integration, filtering, smoothing
│   │   ├── registration.ts          # 2D→3D bridge: ONNX output → Three.js world coords
│   │   ├── calibration.ts           # Camera calibration / projection matrix
│   │   └── tracker.test.ts
│   ├── ui/
│   │   ├── shared/
│   │   │   ├── button.ts            # Reusable action button (retry, restart)
│   │   │   ├── indicator.ts         # Status dot / spinner atoms
│   │   │   └── permission.ts        # Camera permission prompt
│   │   ├── transitions.ts           # Enter/exit animations between FSM states
│   │   ├── splash.ts                # Splash screen
│   │   ├── loading.ts               # Model download progress
│   │   ├── camera.ts                # Camera preview + permission prompt
│   │   ├── tracking.ts              # Tracking active indicator
│   │   ├── lost.ts                  # Tracking lost — graceful fade + re-acquisition
│   │   ├── error.ts                 # Error + retry UI
│   │   ├── unsupported.ts           # Device incapable of WebAR fallback message
│   │   ├── splash.test.ts
│   │   ├── loading.test.ts
│   │   ├── camera.test.ts
│   │   ├── tracking.test.ts
│   │   ├── lost.test.ts
│   │   ├── error.test.ts
│   │   └── unsupported.test.ts
│   └── sw/
│       ├── service-worker.ts        # Cache-first with version invalidation
│       └── sw.integration.test.ts
├── public/
│   ├── models/
│   │   ├── statue-model.ort         # Compact ONNX recognition model
│   │   └── overlay-model.glb        # Draco-compressed colored replica
│   └── wasm/
│       ├── ort-wasm-simd-threaded.wasm
│       └── ort-wasm-simd-threaded.mjs
├── tools/
│   └── training/
│       ├── export-photogrammetry.py # Polycam GLB export preparation
│       └── train-pipeline.ipynb     # Model training notebook
├── infra/
│   ├── Dockerfile                   # nginx:alpine with custom.conf
│   ├── nginx/
│   │   └── custom.conf              # WASM MIME, COOP/COEP, caching
│   ├── docker-compose.yml           # Coolify service definition
│   └── verify.sh                    # Smoke test: WASM MIME, headers, HTTPS
└── .github/
    └── workflows/
        └── deploy.yml               # Vite build → Coolify deploy
```

### Architectural Boundaries

**Pipeline Layers (Main Thread ↔ Worker ↔ Render pipeline):**
- `camera/` captures frames → transfers to `worker/` via postMessage(ArrayBuffer)
- `worker/index.ts` bootstraps `self.onmessage` → dispatches to `inference.ts`
- `worker/inference.ts` runs ONNX model → returns raw output → `ar/registration.ts` maps 2D→3D
- `ar/tracker.ts` filters/smooths pose → `render/ar-mesh.ts` applies to Three.js group
- `state/` controls which pipeline stages are active based on FSM state
- `ui/` renders state-appropriate DOM overlays using Tailwind utility classes, orchestrated by `transitions.ts`

**No backend API boundaries** — entirely client-side. Only external fetch is to origin server for static assets (WASM, model, GLB).

### Requirements to Structure Mapping

- **Camera & Permissions (FR1-FR3):** `src/camera/stream.ts`, `src/camera/frame.ts`, `src/ui/shared/permission.ts`
- **Object Recognition & Tracking (FR4-FR7):** `src/worker/inference.ts`, `src/worker/preprocess.ts`, `src/ar/registration.ts`, `src/ar/tracker.ts`
- **AR Overlay (FR8-FR10):** `src/render/scene.ts`, `src/render/ar-mesh.ts`
- **Loading & Initialization (FR11-FR13):** `src/sw/service-worker.ts`, `src/state/machine.ts`, `src/config.ts`
- **User Experience (FR14-FR17):** `src/ui/*` (all state-specific modules + shared atoms)

**Cross-Cutting:**
- Device detection: `src/render/adaptive.ts`
- PWA config: `manifest.json`, `src/sw/service-worker.ts`
- State orchestration: `src/state/machine.ts`
- Configuration: `src/config.ts`

### Integration Points

**Main Thread ↔ Web Worker:**
- `camera/frame.ts` → postMessage `{ type: 'FRAME_DATA', payload: ImageBitmap }`
- `worker/index.ts` → receives message → `inference.ts` → postMessage `{ type: 'INFERENCE_RESULT', payload: RawInferenceOutput }`
- `ar/registration.ts` → subscribes to `RawInferenceOutput`, produces `PoseData`
- `ar/tracker.ts` → filters `PoseData` → feeds `render/ar-mesh.ts`

**Service Worker ↔ Main Thread:**
- SW install event → precache WASM + model
- SW activate → check model version, invalidate stale
- Main thread → `postMessage('SKIP_WAITING')` on user gesture

**Data Flow:**
```
Camera Stream → Frame Capture (OffscreenCanvas) → Web Worker
    → ONNX Inference → RawOutput → postMessage(ArrayBuffer)
    → Registration (2D→3D mapping) → Tracker (filter/smooth)
    → Three.js AR Mesh (6DoF sync)

State Machine orchestrates:
  splash → loading (download model+WASM) → camera (start stream)
  → tracking (active inference+render) → lost (fade, re-acquire)
  → error (retry) from any active state
  → unsupported (terminal) if device incapable
```

### File Organization Patterns
- **Config files:** project root (vite.config.ts, vitest.config.ts, tsconfig.json, package.json)
- **Source code:** `src/` by domain (camera, worker, render, ar, ui, state, sw)
- **Tests:** co-located `*.test.ts` next to source, per-component isolation
- **Static assets:** `public/models/` (model + GLB), `public/wasm/` (ONNX binaries)
- **Deployment:** `infra/` (Dockerfile, Nginx config, compose, verify script)
- **Training:** `tools/training/` (auxiliary Python notebook, scripts)
- **CI:** `.github/workflows/deploy.yml`

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified
6 areas where AI agents could make different choices

### Naming Patterns

**Files & Directories:**
- All source files: camelCase (`inference.ts`, `preprocess.ts`, `service-worker.ts`)
- TypeScript interfaces: PascalCase (`StateMachine`, `PoseData`, `AppState`)
- Type definitions: PascalCase with `Type` suffix (`InferenceResultType`, `EventType`)
- Enums: PascalCase (`AppState`, `TrackingStatus`)
- Constants: UPPER_SNAKE_CASE (`MAX_INFERENCE_FPS`, `MODEL_VERSION_HASH`)
- Private class members: `#` prefix (native private fields, not `_` prefix)

**State Machine Events:**
- Event type strings: `SCREAMING_SNAKE_CASE` (`CAMERA_READY`, `TRACKING_LOST`, `MODEL_LOADED`)
- State names: lowercase (`splash`, `loading`, `camera`, `tracking`, `lost`, `error`)

**Web Worker Messages:**
- Message type field: `type` string in SCREAMING_SNAKE_CASE
- Message payload field: `payload` object
- Pattern: `{ type: 'INFERENCE_RESULT', payload: PoseData }`

### Structure Patterns

**Project Organization:**
- Tests: co-located with source files (`inference.test.ts` next to `inference.ts`)
- Static assets: `public/models/` (GLB), `public/wasm/` (ONNX WASM binaries)
- Styles: Single `src/style.css` with `@import "tailwindcss"`

### Communication Patterns

**Main Thread ↔ Web Worker:**
- Request/response via message type pairing
- Worker sends `INFERENCE_RESULT` or `INFERENCE_ERROR`
- Main thread sends `FRAME_DATA` or `RECONFIGURE`

**Service Worker ↔ Main Thread:**
- SW sends `CACHE_READY`, `MODEL_UPDATE_AVAILABLE`
- Main thread sends `SKIP_WAITING` on user gesture

### Process Patterns

**Error Handling:**
- All async operations have try/catch with typed error responses
- FSM transitions to `error` state on unrecoverable failure
- `error` state shows retry UI with Tailwind-styled button
- Camera permission denied is a distinct handled path (not a generic error)

**Device Tier Detection:**
- Single `detectDeviceTier(): 1 | 2 | 3` function
- Runs once on app init before camera starts
- Determines inference backend, resolution, and cadence

**Model Loading:**
- Lazy-load GLB after `tracking` state is entered
- Preload ONNX model and WASM runtime in `loading` state
- Service Worker caches both with version hash

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Vite vanilla-ts + Three.js r184 + ONNX Runtime Web 1.26.0 + Tailwind CSS v4 — all compatible under TypeScript strict, no conflicting dependencies
- No framework conflicts (no React/Vue overhead)
- Vite 8 Rolldown handles TypeScript, WASM, worker imports, and CSS (Tailwind plugin) in a single pipeline

**Pattern Consistency:**
- camelCase files, PascalCase interfaces, SCREAMING_SNAKE_CASE events — consistent across all 7 source domains
- postMessage protocol uses same { type, payload } shape in worker ↔ main thread ↔ SW
- Error handling pattern (typed errors → FSM error state → retry UI) consistent across camera, worker, render layers

**Structure Alignment:**
- Domain-based grouping (camera/, worker/, render/, ar/, state/, ui/, sw/) maps 1:1 to pipeline stages
- Integration points defined at domain boundaries via typed interfaces (PoseData, RawInferenceOutput, DeviceTier)

### Requirements Coverage Validation ✅

**Functional Requirements (17 of 17 covered):**
- FR1-FR3 (Camera & Permissions): camera/stream.ts + frame.ts + ui/shared/permission.ts
- FR4-FR7 (Object Recognition & Tracking): worker/inference.ts + preprocess.ts + ar/registration.ts + tracker.ts
- FR8-FR10 (AR Overlay): render/scene.ts + ar-mesh.ts
- FR11-FR13 (Loading & Initialization): sw/service-worker.ts + state/machine.ts + config.ts
- FR14-FR17 (User Experience): All 7 ui/* modules + transitions.ts

**Non-Functional Requirements (5 of 5 covered):**
- NFR1 (100ms inference): Web Worker offload + transferable ArrayBuffers + adaptive quality tiers
- NFR2 (15fps overlay): 3-tier adaptive system with inference cadence control
- NFR3 (10s load): Service Worker cache-first with preload in loading state
- NFR4 (3s re-acquisition): FSM lost→tracking transition + continuous frame monitoring
- NFR5 (5s cold start): Progressive loading sequence (splash → camera → model → tracking)

### Implementation Readiness Validation ✅

**Decision Completeness:**
- All critical decisions documented with versions: Vite 8, Three.js r184, ONNX Runtime Web 1.26.0, Tailwind CSS v4, Node.js 20+
- Starter template command specified

**Structure Completeness:**
- 40+ source files across 7 domains with co-located tests
- Infrastructure: Dockerfile, Nginx config, docker-compose, verify script, CI workflow

**Pattern Completeness:**
- Naming, communication, error handling, device detection — all specified

### Gap Analysis Results

**No Critical Gaps** — all FRs and NFRs have architectural support.

**Minor Gaps (Non-Blocking):**
- Training pipeline versioning — deferred to post-MVP
- PoC metrics collection — implementation detail for dev story
- Model integrity hash verification deferred (acceptable for PoC)

### Architecture Completeness Checklist

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Fully client-side architecture with zero server cost
- Cross-platform from day one (WASM universal, WebGPU progressive enhancement)
- All 17 FRs and 5 NFRs mapped to specific source files
- Error handling built into FSM (error state, retry, unsupported device fallback)
- Progressive loading by state eliminates single-spinner problem

**Areas for Future Enhancement:**
- Multi-artifact statue recognition (currently single-object)
- Battery-aware throttling for extended museum sessions
- Model integrity SHA-256 verification
- On-device performance analytics dashboard

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and domain boundaries
- Co-locate tests with source files
- Use typed interfaces for cross-domain communication

**First Implementation Priority:**
```bash
npm create vite@latest mediation-ar-greek-colors -- --template vanilla-ts
npm install three onnxruntime-web tailwindcss @tailwindcss/vite vitest vite-plugin-static-copy
```
Then configure: vitest.config.ts, tailwindcss plugin in vite.config.ts, tsconfig strict mode.
