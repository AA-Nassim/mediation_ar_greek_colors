/** Application states for the finite state machine. */
export enum AppState {
  /** Initial state — app just loaded, showing splash screen. */
  Splash = "splash",
  /** Intermediate — Three.js ready, downloading model + WASM. */
  Loading = "loading",
  /** Active — camera feed live, waiting for detection. */
  Camera = "camera",
  /** Active — statue detected, overlay rendering. */
  Tracking = "tracking",
  /** Recoverable — tracking lost, trying to re-acquire. */
  Lost = "lost",
  /** Recovery — unrecoverable error with retry UI. */
  Error = "error",
  /** Terminal — device incapable, no exit transitions. */
  Unsupported = "unsupported",
}

/** Events that trigger state transitions in the app FSM. */
export enum AppEvent {
  /** Three.js renderer and scene are ready. */
  RENDERER_READY = "RENDERER_READY",
  /** Model and WASM runtime finished downloading, camera stream acquired. */
  MODEL_LOADED = "MODEL_LOADED",
  /** ONNX inference pipeline returned a successful detection. */
  STATUE_DETECTED = "STATUE_DETECTED",
  /** Tracking confidence dropped below threshold for N consecutive frames. */
  TRACKING_LOST = "TRACKING_LOST",
  /** Statue re-detected in frame while in lost state. */
  STATUE_REACQUIRED = "STATUE_REACQUIRED",
  /** Unrecoverable error occurred (camera denied, WebGL unsupported, WASM failure). */
  FATAL_ERROR = "FATAL_ERROR",
  /** Device lacks required capabilities (no WebGL, no Web Worker support). */
  UNSUPPORTED = "UNSUPPORTED",
  /** User requested retry from error state. */
  RETRY = "RETRY",
}

/** Structured error information for FSM error handling. */
export interface FSMError {
  /** Human-readable error message. */
  message: string;
  /** Machine-readable error code. */
  code: string;
  /** Whether the error can be recovered from via retry. */
  retryable: boolean;
}

/**
 * A guard function that determines whether a transition is allowed.
 * @param from - The current state
 * @param to - The target state
 * @returns true if the transition is allowed, false otherwise
 */
export type TransitionGuard<S> = (from: S, to: S) => boolean;

/**
 * Maps each state to a partial map of events to target states.
 * Not every event is valid for every state — this is intentional.
 */
export type TransitionMap<S extends string, E extends string> = Record<
  S,
  Partial<Record<E, S>>
>;

// --- Web Worker Message Types ---

export type RawInferenceOutput = {
  detected: boolean;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
};

export type WorkerOutboundMessage =
  | { type: 'FRAME_DATA'; payload: { frameId: number; width: number; height: number; data: ArrayBuffer } }
  | { type: 'TERMINATE' };

export type WorkerInboundMessage =
  | { type: 'WORKER_READY' }
  | { type: 'FRAME_ACK'; payload: { frameId: number } }
  | { type: 'INFERENCE_RESULT'; payload: RawInferenceOutput }
  | { type: 'INFERENCE_ERROR'; payload: { message: string; code: string } };
