export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
}

export const FALLBACK_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
}

export const FRAME_CAPTURE_INTERVAL_MS = 33

// --- Model Download ---

/** Path to the ONNX recognition model served from Vite's public directory. */
export const MODEL_URL = '/models/statue-model.ort'

/** Maximum time (ms) to wait for the model download before aborting. */
export const MODEL_DOWNLOAD_TIMEOUT_MS = 30_000

// WASM strategy (Option A — simplest):
// Story 1.4 places WASM files as static assets in public/wasm/.
// Story 2.1 sets ort.env.wasm.wasmPaths = '/wasm/' and ONNX RT
// fetches WASM internally. No manual WASM pre-fetch in this story.
