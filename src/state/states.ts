import { AppState, AppEvent } from "../types/events";
import type { TransitionMap } from "../types/events";
import { StateMachine } from "./machine";

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

/**
 * Factory function that creates a configured app state machine.
 * Registers onEnter/onExit callbacks for UI transitions (stubbed)
 * and a default error handler.
 */
export function createAppStateMachine(): StateMachine<AppState, AppEvent> {
  const fsm = new StateMachine<AppState, AppEvent>(
    AppState.Splash,
    APP_TRANSITIONS
  );

  // Stubbed UI lifecycle hooks — actual implementations deferred to Story 1.3+
  fsm.onEnter(AppState.Splash, () => {
    // mountSplashUI()
  });
  fsm.onExit(AppState.Splash, () => {
    // unmountSplashUI()
  });

  fsm.onEnter(AppState.Loading, () => {
    // mountLoadingUI()
  });
  fsm.onExit(AppState.Loading, () => {
    // unmountLoadingUI()
  });

  fsm.onEnter(AppState.Camera, () => {
    // mountCameraUI()
  });
  fsm.onExit(AppState.Camera, () => {
    // unmountCameraUI()
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
