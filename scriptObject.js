/**
 * The effect that is currently running
 */
let effectStack = [];

class State {
  constructor(value) {
    this.value = value;
    this.subs = new Set();
  }

  get() {
    if (effectStack.length > 0) {
      const currentEffect = effectStack.at(-1);
      this.subs.add(currentEffect);
    }
    return this.value;
  }

  set(nextValue) {
    this.value = nextValue;
    [...this.subs].forEach((effect) => effect.notify());
  }
}

class Effect {
  constructor(effect) {
    this.effect = effect;
    this.#run();
  }

  notify = () => this.#run();

  #run() {
    effectStack.push(this);
    try {
      this.effect();
    } finally {
      effectStack.pop();
    }
  }
}

class LafElement {
  constructor(tag, props, ...children) {
    this.tag = tag;
    this.props = props ?? {};
    this.children = children;
  }

  static #reader(v) {
    if (v instanceof State) return () => v.get();
    if (typeof v === "function") return v;
    return null;
  }

  render() {
    const el = document.createElement(this.tag);

    // handle props
    for (const [k, v] of Object.entries(this.props)) {
      const read = LafElement.#reader(v);
      if (k.startsWith("on")) {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (read) {
        new Effect(() => el.setAttribute(k, read()));
      } else {
        el.setAttribute(k, v);
      }
    }

    // handle children
    for (const child of this.children) {
      const read = LafElement.#reader(child);
      if (read instanceof LafElement) {
        el.append(read.render());
      } else if (read) {
        const text = document.createTextNode("");
        new Effect(() => (text.data = read()));
        el.append(text);
      } else {
        el.append(child);
      }
    }

    return el;
  }
}

function Counter() {
  const state = new State(0);

  return new LafElement(
    "button",
    { onClick: () => state.set(state.get() + 1) },
    "Clicked ",
    state,
    " times",
  ).render();
}

document.body.append(Counter());
