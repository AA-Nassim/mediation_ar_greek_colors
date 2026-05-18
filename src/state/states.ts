import { AppState, AppEvent } from "../types/events";
import type { TransitionMap } from "../types/events";
import { StateMachine } from "./machine";
import type { CameraResult, CameraError } from "../camera/stream";
import { requestCameraStreamWithFallback, stopCameraStream, createHiddenVideoElement } from "../camera/stream";
import { createScene, createVideoBackground, startRenderLoop, resizeRenderer } from "../render/scene";
import type { SceneContext } from "../render/scene";
import { showPermissionDenied, showCameraError } from "../ui/shared/permission";
import { showSplash } from "../ui/splash";
import { showLoadingProgress, showDownloadError } from "../ui/loading";
import { downloadModel } from "../loader";

/** Transition map for the app state machine. */
export const APP_TRANSITIONS: TransitionMap<AppState, AppEvent> = {
  [AppState.Splash]: {
    [AppEvent.RENDERER_READY]: AppState.Loading,
    [AppEvent.FATAL_ERROR]: AppState.Error,
    [AppEvent.UNSUPPORTED]: AppState.Unsupported,
  },
  [AppState.Loading]: {
    [AppEvent.MODEL_LOADED]: AppState.Camera,
    [AppEvent.FATAL_ERROR]: AppState.Error,
    [AppEvent.UNSUPPORTED]: AppState.Unsupported,
  },
  [AppState.Camera]: {
    [AppEvent.STATUE_DETECTED]: AppState.Tracking,
    [AppEvent.FATAL_ERROR]: AppState.Error,
    [AppEvent.UNSUPPORTED]: AppState.Unsupported,
  },
  [AppState.Tracking]: {
    [AppEvent.TRACKING_LOST]: AppState.Lost,
    [AppEvent.FATAL_ERROR]: AppState.Error,
    [AppEvent.UNSUPPORTED]: AppState.Unsupported,
  },
  [AppState.Lost]: {
    [AppEvent.STATUE_REACQUIRED]: AppState.Tracking,
    [AppEvent.FATAL_ERROR]: AppState.Error,
    [AppEvent.UNSUPPORTED]: AppState.Unsupported,
  },
  [AppState.Error]: {
    [AppEvent.RETRY]: AppState.Loading,
  },
  [AppState.Unsupported]: {},
};

let currentStream: MediaStream | null = null
let sceneContext: SceneContext | null = null
let stopRenderLoopFn: (() => void) | null = null

export function setSceneContext(ctx: SceneContext): void {
  sceneContext = ctx
}

type AsyncResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

const wrap = async <T>(p: Promise<T>): Promise<AsyncResult<T>> => {
  try { return { ok: true as const, value: await p } }
  catch (e) { return { ok: false as const, error: e } }
}

/**
 * Factory function that creates a configured app state machine.
 * Registers onEnter/onExit callbacks for UI transitions (stubbed)
 * and a default error handler.
 */
export function createAppStateMachine(container: HTMLElement): StateMachine<AppState, AppEvent> {
  const fsm = new StateMachine<AppState, AppEvent>(
    AppState.Splash,
    APP_TRANSITIONS
  );

  // Register ALL lifecycle hooks before triggering any transition
  // Note: Splash has no onEnter — the initial state is bootstrapped explicitly below.
  fsm.onExit(AppState.Splash, () => {
    container.innerHTML = '';
  });

  fsm.onEnter(AppState.Loading, async () => {
    container.innerHTML = '';

    const updateProgress = showLoadingProgress(container);

    const [modelResult, camResult] = await Promise.all([
      wrap(downloadModel(updateProgress)),
      wrap(requestCameraStreamWithFallback()),
    ]);

    if (modelResult.ok === false) {
      fsm.dispatch(AppEvent.FATAL_ERROR);
      return;
    }

    if (camResult.ok === false) {
      handleCameraError(fsm, container, camResult.error as CameraError);
      return;
    }

    const cam = camResult.value;
    if (!('stream' in cam)) {
      handleCameraError(fsm, container, cam);
      return;
    }

    currentStream = cam.stream;
    const video = createHiddenVideoElement(cam.stream);
    await video.play();
    if (sceneContext) {
      createVideoBackground(sceneContext.scene, video);
      stopRenderLoopFn = startRenderLoop(sceneContext, () => {});
    }
    fsm.dispatch(AppEvent.MODEL_LOADED);
  });
  fsm.onExit(AppState.Loading, () => {
    container.classList.add('opacity-0', 'transition-opacity', 'duration-500', 'ease-out');
  });

  fsm.onEnter(AppState.Camera, () => {
    container.innerHTML = '';
    container.classList.remove('opacity-0', 'transition-opacity', 'duration-500', 'ease-out');
    if (sceneContext) {
      container.appendChild(sceneContext.renderer.domElement);
    }
  });
  fsm.onExit(AppState.Camera, () => {
    stopRenderLoopFn?.();
    if (currentStream) {
      stopCameraStream(currentStream);
      currentStream = null;
    }
  });

  fsm.onEnter(AppState.Tracking, () => {
    // mountTrackingUI()
  });
  fsm.onExit(AppState.Tracking, () => {
    // unmountTrackingUI()
  });

  fsm.onEnter(AppState.Lost, () => {
    // mountLostUI()
  });
  fsm.onExit(AppState.Lost, () => {
    // unmountLostUI()
  });

  fsm.onEnter(AppState.Error, () => {
    showDownloadError(container, () => {
      fsm.dispatch(AppEvent.RETRY);
    });
  });
  fsm.onExit(AppState.Error, () => {
    // unmountErrorUI()
  });

  fsm.onEnter(AppState.Unsupported, () => {
    // mountUnsupportedUI()
  });
  fsm.onExit(AppState.Unsupported, () => {
    // unmountUnsupportedUI()
  });

  fsm.setErrorHandler((error) => {
    console.error(`FSM Error [${error.code}]: ${error.message}`);
  });

  // Bootstrap: FSM constructor doesn't call onEnter, so show splash and
  // dispatch RENDERER_READY explicitly. Initial state effects are handled
  // right here rather than in a never-reached onEnter(Splash) hook.
  showSplash(container);
  fsm.dispatch(AppEvent.RENDERER_READY);

  return fsm;
}

function handleCameraError(fsm: StateMachine<AppState, AppEvent>, container: HTMLElement, error: CameraError): void {
  switch (error.code) {
    case 'PERMISSION_DENIED':
      showPermissionDenied(container, () => {
        fsm.dispatch(AppEvent.RETRY);
      });
      break
    case 'NO_CAMERA':
      showCameraError(container, 'No camera found on this device. Please use a device with a camera.', () => {
        fsm.dispatch(AppEvent.RETRY);
      });
      break
    case 'OVERRULED_BY_CONSTRAINTS':
    case 'UNKNOWN':
      showCameraError(container, error.message, () => {
        fsm.dispatch(AppEvent.RETRY);
      });
      break
  }
}
