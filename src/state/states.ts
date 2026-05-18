import { AppState, AppEvent } from "../types/events";
import type { TransitionMap } from "../types/events";
import { StateMachine } from "./machine";
import type { CameraResult, CameraError } from "../camera/stream";
import { requestCameraStreamWithFallback, stopCameraStream, createHiddenVideoElement } from "../camera/stream";
import { createScene, createVideoBackground, startRenderLoop, resizeRenderer } from "../render/scene";
import type { SceneContext } from "../render/scene";
import { showPermissionPrompt, showPermissionDenied, showCameraError } from "../ui/shared/permission";

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
    [AppEvent.RETRY]: AppState.Splash,
  },
  [AppState.Unsupported]: {},
};

let currentStream: MediaStream | null = null
let sceneContext: SceneContext | null = null
let stopRenderLoopFn: (() => void) | null = null

export function setSceneContext(ctx: SceneContext): void {
  sceneContext = ctx
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

  fsm.onEnter(AppState.Splash, () => {
    showPermissionPrompt(container, () => {
      fsm.dispatch(AppEvent.RENDERER_READY);
    });
  });
  showPermissionPrompt(container, () => {
    fsm.dispatch(AppEvent.RENDERER_READY);
  });
  fsm.onExit(AppState.Splash, () => {
    container.innerHTML = '';
  });

  fsm.onEnter(AppState.Loading, async () => {
    container.innerHTML = '';
    const loadingEl = document.createElement('div');
    loadingEl.className = 'flex flex-col items-center justify-center h-full gap-4 p-8 text-center';
    loadingEl.innerHTML = '<p class="text-lg text-gray-500">Preparing AR experience...</p>';
    container.appendChild(loadingEl);

    const result = await requestCameraStreamWithFallback();
    if ('stream' in result) {
      currentStream = result.stream;
      const video = createHiddenVideoElement(result.stream);
      await video.play();
      if (sceneContext) {
        createVideoBackground(sceneContext.scene, video);
        stopRenderLoopFn = startRenderLoop(sceneContext, () => {});
      }
      fsm.dispatch(AppEvent.MODEL_LOADED);
    } else {
      handleCameraError(fsm, container, result);
    }
  });
  fsm.onExit(AppState.Loading, () => {
    // unmountLoadingUI()
  });

  fsm.onEnter(AppState.Camera, () => {
    container.innerHTML = '';
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
    // mountErrorUI()
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
