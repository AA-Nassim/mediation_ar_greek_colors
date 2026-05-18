import type { FSMError, TransitionGuard, TransitionMap } from "../types/events";

/**
 * Generic finite state machine with typed states and events.
 * Enforces transition guards, lifecycle hooks, and error handling.
 */
export class StateMachine<S extends string, E extends string> {
  #state: S;
  #transitions: TransitionMap<S, E>;
  #guards: Map<string, TransitionGuard<S>>;
  #onEnter: Map<S, (prev: S) => void>;
  #onExit: Map<S, (next: S) => void>;
  #onError: (error: FSMError) => void;

  /**
   * Create a new StateMachine instance.
   * @param initialState - The initial state of the machine
   * @param transitions - The transition map defining valid state changes
   */
  constructor(initialState: S, transitions: TransitionMap<S, E>) {
    this.#state = initialState;
    this.#transitions = transitions;
    this.#guards = new Map();
    this.#onEnter = new Map();
    this.#onExit = new Map();
    this.#onError = () => {};
  }

  /** Returns the current state. */
  get state(): S {
    return this.#state;
  }

  /**
   * Dispatch an event to trigger a state transition.
   * @param event - The event to dispatch
   * @returns true if the transition succeeded, false otherwise
   */
  dispatch(event: E): boolean {
    const nextState = this.#transitions[this.#state]?.[event];

    if (nextState === undefined || nextState === null) {
      console.warn(
        `Invalid transition: no mapping for event "${event}" in state "${this.#state}"`
      );
      return false;
    }

    const guardKey = `${this.#state}:${event}`;
    const guard = this.#guards.get(guardKey);
    if (guard !== undefined && !guard(this.#state, nextState)) {
      console.warn(
        `Transition blocked by guard: "${this.#state}" --[${event}]--> "${nextState}"`
      );
      return false;
    }

    const exitFn = this.#onExit.get(this.#state);
    if (exitFn !== undefined) {
      exitFn(nextState);
    }

    const prevState = this.#state;

    this.#state = nextState;

    const enterFn = this.#onEnter.get(this.#state);
    if (enterFn !== undefined) {
      enterFn(prevState);
    }

    return true;
  }

  /**
   * Register a guard function for a specific event transition.
   * @param event - The event to guard
   * @param guard - The guard function
   */
  addGuard(from: S, event: E, guard: TransitionGuard<S>): void {
    const guardKey = `${from}:${event}`;
    this.#guards.set(guardKey, guard);
  }

  /**
   * Register an onEnter lifecycle hook for a state.
   * Called after transitioning INTO the state.
   * @param state - The state to hook
   * @param fn - The callback, receives the previous state
   */
  onEnter(state: S, fn: (prev: S) => void): void {
    this.#onEnter.set(state, fn);
  }

  /**
   * Register an onExit lifecycle hook for a state.
   * Called before transitioning OUT OF the state.
   * @param state - The state to hook
   * @param fn - The callback, receives the next state
   */
  onExit(state: S, fn: (next: S) => void): void {
    this.#onExit.set(state, fn);
  }

  /**
   * Set the error handler for the state machine.
   * @param fn - The error callback
   */
  setErrorHandler(fn: (error: FSMError) => void): void {
    this.#onError = fn;
  }

  /**
   * Dispatch an error to the registered error handler.
   * Called when unrecoverable errors occur.
   * @param error - The error to handle
   */
  dispatchError(error: FSMError): void {
    this.#onError(error);
  }

  /**
   * Reset the state machine to a specific state.
   * Intended for testing.
   * @param initialState - The state to reset to
   */
  reset(initialState: S): void {
    this.#state = initialState;
  }
}
