export { Owner, owner, withOwner, State, Reducer, Effect };

/**
 * The effect that is currently running
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
  constructor(value) {
    this.#value = value;
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
}

class Reducer extends State {
  #reducer;

  constructor(reducer, value) {
    super(value);
    this.#reducer = reducer;
  }

  dispatch = () => {
    super.set(this.#reducer(this.peek()));
  };

  // @Override
  set = () => {
    throw new Error("use dispatch on Reducer, not the set method");
  };
}

class Effect {
  #debs = new Set();
  #children = new Set();
  #owner = owner;

  constructor(effect) {
    this.effect = effect;
    effectStack.at(-1)?.addChild(this);
    this.#run();
  }

  addChild(effect) {
    this.#children.add(effect);
  }

  notify = () => this.#run();

  track(state) {
    this.#debs.add(state);
  }

  dispose() {
    this.#children.forEach((child) => child.dispose());
    this.#children.clear();
    this.#debs.forEach((state) => state.unsubscribe(this));
    this.#debs.clear();
  }

  #run() {
    this.dispose();
    effectStack.push(this);
    try {
      withOwner(this.#owner, () => this.effect());
    } finally {
      effectStack.pop();
    }
  }
}
