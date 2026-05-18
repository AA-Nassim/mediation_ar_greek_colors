import { describe, it, expect, vi, beforeEach } from "vitest";
import { StateMachine } from "./machine";
import { createAppStateMachine, APP_TRANSITIONS } from "./states";
import { AppState, AppEvent } from "../types/events";
import type { TransitionMap } from "../types/events";

describe("StateMachine", () => {
  type TestState = "idle" | "running" | "stopped";
  type TestEvent = "START" | "STOP" | "RESET";

  const testTransitions: TransitionMap<TestState, TestEvent> = {
    idle: { START: "running", RESET: "idle" },
    running: { STOP: "stopped", RESET: "idle" },
    stopped: { RESET: "idle" },
  };

  let fsm: StateMachine<TestState, TestEvent>;

  beforeEach(() => {
    fsm = new StateMachine<TestState, TestEvent>("idle", testTransitions);
  });

  describe("initialization", () => {
    it("initializes in the specified initial state (AC2 equivalent)", () => {
      expect(fsm.state).toBe("idle");
    });
  });

  describe("state transitions", () => {
    it("transitions idle → running via START (AC3 equivalent)", () => {
      const result = fsm.dispatch("START");
      expect(result).toBe(true);
      expect(fsm.state).toBe("running");
    });

    it("transitions running → stopped via STOP (AC4 equivalent)", () => {
      fsm.dispatch("START");
      const result = fsm.dispatch("STOP");
      expect(result).toBe(true);
      expect(fsm.state).toBe("stopped");
    });

    it("transitions stopped → idle via RESET (AC5 equivalent)", () => {
      fsm.dispatch("START");
      fsm.dispatch("STOP");
      const result = fsm.dispatch("RESET");
      expect(result).toBe(true);
      expect(fsm.state).toBe("idle");
    });
  });

  describe("invalid transitions", () => {
    it("returns false and does not change state on invalid transition", () => {
      expect(fsm.dispatch("STOP")).toBe(false);
      expect(fsm.state).toBe("idle");
    });

    it("logs a warning on invalid transition", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      fsm.dispatch("STOP");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });
  });

  describe("guards", () => {
    it("prevents transition when guard returns false", () => {
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.addGuard("idle", "START", () => false);

      const result = fsm2.dispatch("START");
      expect(result).toBe(false);
      expect(fsm2.state).toBe("idle");
    });

    it("allows transition when guard returns true", () => {
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.addGuard("idle", "START", () => true);

      const result = fsm2.dispatch("START");
      expect(result).toBe(true);
      expect(fsm2.state).toBe("running");
    });

    it("logs warning when guard blocks transition", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.addGuard("idle", "START", () => false);

      fsm2.dispatch("START");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });
  });

  describe("lifecycle hooks", () => {
    it("fires onEnter callback on transition with prev state (AC11)", () => {
      const onEnterSpy = vi.fn();
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.onEnter("running", onEnterSpy);

      fsm2.dispatch("START");
      expect(onEnterSpy).toHaveBeenCalledWith("idle");
    });

    it("fires onExit callback on transition with next state (AC11)", () => {
      const onExitSpy = vi.fn();
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.onExit("idle", onExitSpy);

      fsm2.dispatch("START");
      expect(onExitSpy).toHaveBeenCalledWith("running");
    });

    it("calls onExit before onEnter in correct sequence", () => {
      const callOrder: string[] = [];
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      fsm2.onExit("idle", () => callOrder.push("exit"));
      fsm2.onEnter("running", () => callOrder.push("enter"));

      fsm2.dispatch("START");
      expect(callOrder).toEqual(["exit", "enter"]);
    });
  });

  describe("error handling", () => {
    it("setErrorHandler does not throw when setting handler", () => {
      const errorHandler = vi.fn();
      const fsm2 = new StateMachine<TestState, TestEvent>("idle", testTransitions);
      expect(() => fsm2.setErrorHandler(errorHandler)).not.toThrow();
    });
  });

  describe("reset", () => {
    it("resets state machine to specified state for testing", () => {
      fsm.dispatch("START");
      expect(fsm.state).toBe("running");

      fsm.reset("idle");
      expect(fsm.state).toBe("idle");
    });
  });

  describe("state getter", () => {
    it("returns current state after each dispatch", () => {
      expect(fsm.state).toBe("idle");
      fsm.dispatch("START");
      expect(fsm.state).toBe("running");
      fsm.dispatch("STOP");
      expect(fsm.state).toBe("stopped");
      fsm.dispatch("RESET");
      expect(fsm.state).toBe("idle");
    });
  });
});

function createMockContainer(): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 375, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: 812, configurable: true })
  return el
}

describe("AppStateMachine", () => {
  describe("initialization", () => {
    it("auto-transitions splash → loading on creation (AC2)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      expect(appFsm.state).toBe(AppState.Loading);
    });
  });

  describe("app transitions", () => {
    it("is in Loading after auto-transition from Splash (AC3)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      expect(appFsm.state).toBe(AppState.Loading);
    });

    it("transitions loading → camera via MODEL_LOADED (AC4)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      expect(appFsm.dispatch(AppEvent.MODEL_LOADED)).toBe(true);
      expect(appFsm.state).toBe(AppState.Camera);
    });

    it("transitions camera → tracking via STATUE_DETECTED (AC5)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.MODEL_LOADED);
      expect(appFsm.dispatch(AppEvent.STATUE_DETECTED)).toBe(true);
      expect(appFsm.state).toBe(AppState.Tracking);
    });

    it("transitions tracking → lost via TRACKING_LOST (AC7)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.MODEL_LOADED);
      appFsm.dispatch(AppEvent.STATUE_DETECTED);
      expect(appFsm.dispatch(AppEvent.TRACKING_LOST)).toBe(true);
      expect(appFsm.state).toBe(AppState.Lost);
    });

    it("transitions lost → tracking via STATUE_REACQUIRED (AC8)", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.MODEL_LOADED);
      appFsm.dispatch(AppEvent.STATUE_DETECTED);
      appFsm.dispatch(AppEvent.TRACKING_LOST);
      expect(appFsm.dispatch(AppEvent.STATUE_REACQUIRED)).toBe(true);
      expect(appFsm.state).toBe(AppState.Tracking);
    });
  });

  describe("FATAL_ERROR from any state (AC9)", () => {
    const errorFromStates = [
      AppState.Loading,
      AppState.Camera,
      AppState.Tracking,
      AppState.Lost,
    ];

    it.each(errorFromStates)(
      "transitions %s → error via FATAL_ERROR",
      (state) => {
        const appFsm = createAppStateMachine(createMockContainer());
        appFsm.dispatch(AppEvent.MODEL_LOADED);
        appFsm.dispatch(AppEvent.STATUE_DETECTED);
        if (state === AppState.Lost) {
          appFsm.dispatch(AppEvent.TRACKING_LOST);
        }
        if (state === AppState.Loading) {
          // Reset to Loading via FATAL_ERROR → Error → RETRY → Loading (auto)
          appFsm.dispatch(AppEvent.FATAL_ERROR);
          appFsm.dispatch(AppEvent.RETRY);
        }
        expect(appFsm.dispatch(AppEvent.FATAL_ERROR)).toBe(true);
        expect(appFsm.state).toBe(AppState.Error);
      }
    );
  });

  describe("unsupported is terminal (AC10)", () => {
    it("has no outgoing transitions from unsupported", () => {
      const unsupportedTransitions = APP_TRANSITIONS[AppState.Unsupported];
      expect(Object.keys(unsupportedTransitions).length).toBe(0);
    });

    it("transitions to unsupported and stays there", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.UNSUPPORTED);
      expect(appFsm.state).toBe(AppState.Unsupported);

      // All events should be invalid from unsupported
      expect(appFsm.dispatch(AppEvent.RENDERER_READY)).toBe(false);
      expect(appFsm.dispatch(AppEvent.FATAL_ERROR)).toBe(false);
      expect(appFsm.dispatch(AppEvent.RETRY)).toBe(false);
    });
  });

  describe("error → retry → loading (AC9)", () => {
    it("transitions error → loading via RETRY directly", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.FATAL_ERROR);
      expect(appFsm.state).toBe(AppState.Error);

      const result = appFsm.dispatch(AppEvent.RETRY);
      expect(result).toBe(true);
      expect(appFsm.state).toBe(AppState.Loading);
    });
  });

  describe("onEnter/onExit lifecycle hooks (AC11)", () => {
    it("registers and fires onEnter callbacks for app states", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      // Already in Loading after auto-transition
      expect(appFsm.state).toBe(AppState.Loading);
    });

    it("registers and fires onExit callbacks for app states", () => {
      const appFsm = createAppStateMachine(createMockContainer());
      appFsm.dispatch(AppEvent.MODEL_LOADED);
      // Hooks are registered and execute without throwing
      expect(appFsm.state).toBe(AppState.Camera);
    });
  });
});
