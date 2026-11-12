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

class State {
  #value;
  #subs = new Set();
  #renderFn;

  constructor(value, renderFn) {
    this.#value = value;
    this.#renderFn = renderFn;
  }

  get() {
    if (effectStack.length > 0) {
      const currentEffect = effectStack.at(-1);
      this.#subs.add(currentEffect);
      currentEffect.track(this);
    }
    return this.#value;
  }

  set(nextValue) {
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

  render() {
    return this.#renderFn ? this.#renderFn(this.get()) : this.get();
  }
}

class Reducer extends State {
  #reducerFn;

  constructor(reducerFn, value, renderFn) {
    super(value, renderFn);
    this.#reducerFn = reducerFn;
  }

  dispatch = () => {
    super.set(this.#reducerFn(this.peek()));
  };

  // @Override
  set = () => {
    throw new Error("use dispatch on Reducer, not the set method");
  };
}

class Effect {
  #disposed = false;
  #debs = new Set();
  #children = new Set();
  #owner = owner;
  #effectFn;

  constructor(effectFn) {
    this.#effectFn = effectFn;
    const parent = effectStack.at(-1);
    if (parent) parent.#addChild(this);
    this.#run();
  }

  #addChild(effect) {
    this.#children.add(effect);
  }

  notify = () => {
    if (this.#disposed) return;
    if (effectStack.includes(this)) return;
    this.#run();
  };

  track(state) {
    this.#debs.add(state);
  }

  #setDisposed(flag) {
    this.#disposed = flag;
  }

  #dispose() {
    this.#children.forEach((child) => {
      child.#setDisposed(true);
      child.#dispose();
    });
    this.#children.clear();
    this.#debs.forEach((state) => state.unsubscribe(this));
    this.#debs.clear();
  }

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
