---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
releaseMode: single-release
classification:
  projectType: web_app
  domain: edtech
  complexity: medium
  projectContext: greenfield
inputDocuments:
  - '_bmad-output/planning-artifacts/research/technical-3d-object-recognition-from-photogrammetry-for-mobile-web-ar-research-2026-05-15.md'
workflowType: 'prd'
documentCounts:
  brief: 0
  research: 1
  brainstorming: 0
  projectDocs: 0
---

# Product Requirements Document - mediation_ar_greek_colors

**Author:** SharkiShark
**Date:** 2026-05-16

## Executive Summary

mediation_ar_greek_colors is a proof-of-concept WebAR application demonstrating markerless 3D object recognition of museum artifacts entirely in the browser. The PoC identifies a specific Greek marble statue from a live mobile camera feed using on-device ML inference, then overlays a historically accurate colored 3D replica that reveals the statue's original painted appearance — no app install, no physical markers, and no modification to the exhibit space required.

The system follows a fully client-side architecture: camera frames are captured via WebRTC `getUserMedia`, processed in a Web Worker using `OffscreenCanvas`, and run through an ONNX Runtime Web inference pipeline (WebAssembly backend with WebGPU fallback). A model trained from Polycam photogrammetry data (via WebAR.rocks.train or a custom DINOv2 pipeline) performs 6DoF pose estimation, which drives a Three.js 3D overlay. All inference runs on-device — zero server cost, no user data leaves the device.

**Target users:** Museum visitors with standard smartphones (iOS Safari + Android Chrome). The PoC validates that sophisticated AR experiences are achievable with 2026 browser capabilities alone, serving as both a technical reference implementation and a client acquisition tool for cultural institutions.

## Project Classification

- **Project Type:** web_app (PWA, browser-based, no native install)
- **Domain:** edtech (cultural heritage technology)
- **Complexity:** medium (novel on-device ML inference pipeline, cross-platform mobile browser constraints, but no regulatory compliance burden)
- **Project Context:** greenfield (building from scratch)

## Success Criteria

### User Success
- Visitor points phone camera at the statue and the colored 3D replica appears overlaid in the correct position within seconds
- Overlay maintains alignment (6DoF tracking) as the visitor moves around the statue, without noticeable drift or loss of lock
- The experience "just works" — no calibration, no tapping targets, no app install

### Technical Success
- **Recognition accuracy:** Statue is consistently detected from varied viewing angles (frontal, ¾ profile, side) under museum lighting conditions
- **Tracking stability:** 6DoF pose is maintained at minimum 15 fps during smooth movement; re-acquisition is fast if tracking is temporarily lost
- **Cross-platform viability:** Runs at functional performance on a mid-range smartphone (e.g., iPhone 12 / Pixel 6)
- **Latency:** End-to-end pipeline (capture → inference → render) completes within 100ms per frame on target device

### Measurable Outcomes
- Statue recognized and colored overlay correctly positioned within 3 seconds of camera pointing at the exhibit
- Tracking maintained for a full 360° walk-around without >2s of cumulative drift-induced misalignment

## User Journeys

### Primary User — Museum Visitor

**Journey 1: Happy Path**
Visitor enters the exhibit hall, sees the Greek marble statue, opens the PWA on their phone. Camera activates, recognizes the statue within seconds, and the colored 3D replica snaps into alignment over the marble surface. They walk around it — the overlay tracks smoothly in 6DoF, revealing the statue's original painted appearance from every angle.

**Journey 2: Edge Case — Tracking Loss**
Visitor moves too quickly or the camera loses sight of the statue. The overlay freezes or fades gracefully. As they re-center the statue in frame, recognition re-acquires within a few seconds and the overlay resumes — no page reload or manual intervention needed.

**Journey 3: First Visit — Cold Start**
Visitor arrives at the Louvre, scans a QR code or types a short URL, and lands on the page. The browser requests camera permission — they tap Allow. The model weights and WASM runtime download (show a loading indicator with progress). Within a few seconds on WiFi, the experience is ready.

### Journey Requirements Summary
- Camera permission flow with clear user guidance
- Loading/progress states for model download
- Recognition acquisition indicator (user knows when it's locked)
- Graceful tracking-loss fallback (overlay fades, re-acquisition without reload)
- No authentication, no accounts, no configuration

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Markerless 3D object tracking on low-texture marble** — No existing WebAR SDK reliably handles near-monotone white stone objects. The PoC combines Feature Matching + PnP with EfficientLoFTR semi-dense matching and ONNX WebGPU inference — a novel pipeline for this specific use case.

- **Zero-footprint museum AR** — No app install, no physical markers, no hardware installation. The entire experience is a QR code and a browser session, challenging the assumption that museum AR requires dedicated infrastructure.

- **Browser-only ML inference for 3D tracking** — Running real-time pose estimation entirely on-device in the browser using WebGPU, without cloud calls or native code.

### Validation Approach
- Validate core recognition pipeline first using WebAR.rocks.train (proven path)
- Then shift to custom ONNX Runtime Web pipeline for cross-platform proof
- Technical benchmarks (framerate, tracking stability, re-acquisition time) serve as validation metrics

## Web App Specific Requirements

### Technical Architecture Considerations
- **Architecture:** Single-page PWA, fully client-side, no backend
- **Browser target:** iOS Safari + Android Chrome (latest 2 major versions)
- **Rendering:** Three.js for 3D overlay
- **Inference pipeline:** ONNX Runtime Web (WASM universal, WebGPU acceleration)
- **Offloading:** Web Worker for frame capture and inference (OffscreenCanvas)
- **Caching:** Service Worker for model weights and WASM runtime
- **Install:** No app store — standard PWA with manifest.json + HTTPS

### Implementation Considerations
- Camera via WebRTC `getUserMedia` with environment-facing mode
- Cross-origin isolation headers (COOP/COEP) if multi-threaded WASM is used
- Model format: ONNX → `.ort` compact format for WASM payload reduction
- 3D model format: GLB (Draco compression for production)

## Project Scoping

### Strategy & Philosophy
- **Approach:** Single-release personal PoC — all capabilities built in one pass
- **Goal:** Validate end-to-end pipeline: photogrammetry → model training → browser inference → 3D overlay
- **Resource:** Solo developer

### Complete Feature Set

**Core Capabilities:**
- Camera-based markerless 3D object recognition of a Greek marble statue
- ONNX Runtime Web inference pipeline (WASM + WebGPU acceleration)
- Web Worker offloading for frame capture and inference
- 6DoF pose estimation and tracking
- Three.js colored replica overlay aligned with real statue
- Service Worker caching for model weights and WASM runtime
- PWA manifest for fullscreen standalone experience

**Nice-to-Have:**
- Multi-artifact recognition support
- Draco compression for 3D overlay models (can add later if needed)
- Battery-aware throttling

### Risk Mitigation Strategy

**Technical Risks:**
- **Low-texture marble recognition failure** → Validate feasibility first with WebAR.rocks.train before building custom ONNX pipeline
- **iOS Safari WASM performance too slow** → Adaptive tier system with WebGPU where available, reduced resolution fallback
- **COOP/COEP headers break site functionality** → Single-threaded WASM fallback avoids need entirely

## Functional Requirements

### Camera & Permissions
- FR1: Visitor can grant or deny camera access via browser permission prompt
- FR2: System can access the rear-facing camera stream via getUserMedia
- FR3: System can capture individual frames from the camera stream for inference

### Object Recognition & Tracking
- FR4: System can detect the target Greek marble statue in a live camera frame
- FR5: System can estimate 6DoF pose (position + orientation) of the detected statue
- FR6: System can maintain tracking as the user moves the camera around the statue
- FR7: System can re-acquire tracking if the statue leaves and re-enters the frame

### AR Overlay
- FR8: System can render a colored 3D replica overlay aligned with the real statue's pose
- FR9: Overlay updates in real-time as tracking updates (6DoF synchronization)
- FR10: Overlay fades gracefully when tracking is lost

### Loading & Initialization
- FR11: System can download and cache the trained recognition model and WASM runtime
- FR12: System can initialize the ONNX Runtime Web inference session
- FR13: System can run as a standalone PWA (manifest.json, fullscreen display)

### User Experience
- FR14: Visitor sees a loading indicator during model download and initialization
- FR15: Visitor receives visual feedback when recognition is acquired (tracking locked)
- FR16: Visitor receives visual feedback when tracking is lost
- FR17: Visitor can access the experience via a URL or QR code — no install required

## Non-Functional Requirements

### Performance
- NFR1: End-to-end inference pipeline (frame capture → preprocessing → ONNX inference → pose estimation → render) completes within **100ms** per cycle on target mid-range device
- NFR2: 6DoF overlay updates at minimum **15 fps** during active tracking
- NFR3: Initial model and WASM runtime load completes within **10 seconds** on standard museum WiFi
- NFR4: Re-acquisition of a lost track completes within **3 seconds** of statue re-entering frame
- NFR5: First-frame statue recognition from cold start (camera permission granted) completes within **5 seconds**
