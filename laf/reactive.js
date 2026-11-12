export { Owner, owner, withOwner, State, Reducer, Effect };

/**
 * The effects that are currently running
 */
let effectStack = [];

let owner = null;

class Owner {
  contexts = new Map();
  constructor(parent) {
    this.parent = parent;
  }
}

function withOwner(o, fn) {
  let prev = owner;
  owner = o;
  try {
    return fn();
  } finally {
    owner = prev;
  }
}

/**
 * A wrapper for a reactive state.
 *
 * Setting a new state notifies all subscribed Effects.
 *
 * Provides render, subscribe, peek and set function.
 */
class State {
  /**
   * @description Any reactive value. Can be an object.
   * @type {any}
   */
  #value;

  /**
   * @description All subscribers that get notified, when value changes.
   * @type {Set<Effect>}
   */
  #subs = new Set();

  /**
   * @description To overwrite the default render function.
   * @type {function(any): any}
   */
  #renderFn;

  constructor(value, renderFn) {
    this.#value = value;
    this.#renderFn = renderFn;
  }

  /**
   * @description provides the
   * @returns {any} the currently wrapped value
   */
  subscribe() {
    if (effectStack.length > 0) {
      const currentEffect = effectStack.at(-1);
      this.#subs.add(currentEffect);
      currentEffect.track(this);
    }
    return this.#value;
  }

  /**
   * @description Sets new value and notifies all subscribers if value is actually new.
   * @param {any} nextValue - new value that this State wraps.
   * @returns {void}
   */
  update(nextValue) {
    if (Object.is(this.#value, nextValue)) return;
    this.#value = nextValue;
    [...this.#subs].forEach((effect) => effect.notify());
  }

  peek() {
    return this.#value;
  }

  unsubscribe(effect) {
    this.#subs.delete(effect);
  }

  /**
   * @description Called when a LafElement gets rendered. Should return how this State should be represented in the dom.
   * @returns {any}
   */
  render() {
    return this.#renderFn ? this.#renderFn(this.subscribe()) : this.subscribe();
  }
}

/**
 * A State with a predefined update functionality. Update value by calling dispatch method.
 *
 * @example
 * const toggle = new Reducer((v) => !v, true, (v) => {return v ? "on" : "of"});
 * toggle.dispatch(); // to toggle between true <-> false
 *
 * @example
 * const counter = new Reducer((v) => v+1, 0);
 */
class Reducer extends State {
  /**
   * @description the function that predife
   * @type {function(any): any}
   */
  #reducerFn;

  constructor(reducerFn, value, renderFn) {
    super(value, renderFn);
    this.#reducerFn = reducerFn;
  }

  dispatch = () => {
    super.update(this.#reducerFn(this.peek()));
  };

  // @Override
  update = () => {
    throw new Error("use dispatch on Reducer, not the set method");
  };
}

/**
 * A wrapper for an effect function.
 *
 * Runs the effect function on instansiation and re-runs it when notified by a tracked State.
 * Befur rerunning it disposes of children and tracked states.
 *
 * @example
 * new Effect(() => {
 *  stateInstance.subscribe(); // now this effect is subscribed to stateInstance and reruns if stateInstance changes value through set()/ dispatch() interface.
 *  console.log("stateInstance changed");
 * })
 */
class Effect {
  /**
   * @desc Guards against rerunning a disposed effect, that can lead to a new subscription and leak memory.
   * @type {boolean} */
  #disposed = false;

  /**
   * @description To keep track of to whom this effect is subscribed, such that on rerun the Effect can unsubscribe. Prefents memory leak, if subscription changes on rerun.
   * @type {Set<State>} */
  #debs = new Set();

  /**
   * @description All Effects thate are created inside the effectFn of this Effect.
   * @type {Set<Effect>} */
  #children = new Set();

  #owner = owner;

  /** @type {function(): void} */
  #effectFn;

  /**
   * Creates the effect, registers it with its parent if present and runs once.
   * @param {function(): void} effectFn - The function to run reactively
   */
  constructor(effectFn) {
    this.#effectFn = effectFn;
    const parent = effectStack.at(-1);
    if (parent) parent.#addChild(this);
    this.#run();
  }

  #addChild(effect) {
    this.#children.add(effect);
  }

  /**
   * @description reruns effect unless it was disposed or is already running.
   * @returns {void}
   */
  notify = () => {
    if (this.#disposed) return;
    if (effectStack.includes(this)) return;
    this.#run();
  };

  /**
   * @description adds a State to the list of observed states.
   * @param {State} state - a state that this effect observes
   */
  track(state) {
    this.#debs.add(state);
  }

  #setDisposed(flag) {
    this.#disposed = flag;
  }

  /**
   * @description Recursively dispose of all children and unsubscribe from all tracked states.
   * @returns {void}
   */
  #dispose() {
    this.#children.forEach((child) => {
      child.#setDisposed(true);
      child.#dispose();
    });
    this.#children.clear();
    this.#debs.forEach((state) => state.unsubscribe(this));
    this.#debs.clear();
  }

  /**
   * @description Cleans up tracking and children of previous run, puts itself on the effectStack and runs the
   * effect function (such that tracked states pick it up as a observer) and cleans itself from effect stack.
   * @returns {void}
   */
  #run() {
    this.#dispose();
    effectStack.push(this);
    try {
      withOwner(this.#owner, () => this.#effectFn());
    } finally {
      effectStack.pop();
    }
  }
}
