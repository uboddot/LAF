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

/**
 *
 * --------
 * @param {String} tag e.g. 'button', 'div'. If null a documentFragment is added (and hence props ignored). Use tag = null, if wrapper needed that doesnt get in the way for example in flex layout.
 * @returns {Node} A node representation, that can be rendered.
 */
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

  static #toNodes(value) {
    if (value == null || value === false) return [];
    if (Array.isArray(value))
      return value.flatMap((v) => LafElement.#toNodes(v));
    if (value instanceof LafElement) {
      const node = value.render();
      return node instanceof DocumentFragment ? [...node.childNodes] : [node];
    }
    if (value instanceof Node) return [value];
    return [document.createTextNode(String(value))];
  }

  // calls nested LafElements recursively
  render() {
    if (typeof this.tag === "function") {
      return withOwner(new Owner(owner), () =>
        this.tag(this.props, ...this.children).render(),
      );
    }

    const el =
      this.tag === null
        ? document.createDocumentFragment()
        : document.createElement(this.tag);

    // handle props
    if (this.tag != null) {
      for (const [k, v] of Object.entries(this.props)) {
        const read = LafElement.#reader(v);

        const assign = (value) => {
          if (k in el) {
            el[k] = value;
          } // DOM property: checked, value, disabled, ...
          else {
            el.setAttribute(k, value);
          } // plain attribute: class, aria-*, data-*, ...
        };

        if (k.startsWith("on")) {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (read) {
          new Effect(() => assign(read()));
        } else {
          assign(v);
        }
      }
    }

    // handle children
    for (const child of this.children) {
      const read = LafElement.#reader(child);

      if (read) {
        const anchor = document.createComment("");
        el.append(anchor);
        let current = [];

        new Effect(() => {
          const next = LafElement.#toNodes(read());
          current.forEach((n) => n.remove());
          anchor.after(...next);
          current = next;
        });
      } else {
        el.append(...LafElement.#toNodes(child));
      }
    }

    return el;
  }
}

// helper
const h = (tag, props, ...children) => new LafElement(tag, props, ...children);

class Context {
  constructor(defaultValue) {
    this.defaultValue = defaultValue;
  }

  use() {
    for (let o = owner; o; o = o.parent) {
      if (o.contexts.has(this)) return o.contexts.get(this);
    }
    return this.defaultValue;
  }
}

function Provider({ context, value }, ...children) {
  owner.contexts.set(context, value);
  return h(null, null, ...children);
}

function mount(component, root) {
  root.append(component.render());
}

// mount(TipTap(), document.body);

function Counter() {
  const state = new State(0);

  return new LafElement(
    "button",
    { onClick: () => state.set(state.get() + 1) },
    "Clicked ",
    state,
    " times",
  );
}

function CounterRed() {
  const state = new Reducer((value) => ++value, 2);

  return new LafElement(
    "button",
    { onClick: () => state.dispatch() },
    "Click ",
    state,
    " times",
  );
}

function Checkbox() {
  const state = new Reducer((v) => !v, false);

  return new LafElement(
    "label",
    {},
    new LafElement("input", {
      type: "checkbox",
      checked: state,
      onChange: () => state.dispatch(),
    }),
    () => (state.get() ? "checked" : "unchecked"),
  );
}

mount(Counter(), document.body);

function TipTap() {
  const counter = CountContext.use();

  return new LafElement(
    "div",
    { class: "tiptap" },
    new LafElement(
      "button",
      { onClick: () => counter.set(counter.get() - 1) },
      "-",
    ),
    new LafElement("div", {}, counter),
    new LafElement(
      "button",
      { onClick: () => counter.set(counter.get() + 1) },
      "+",
    ),
  );
}

function Details() {
  const checkState = new Reducer((v) => !v, false);
  const count = CountContext.use();

  let items = [];
  for (let i = 0; i < 20; i++) {
    items.push("detail number " + i);
  }

  return h(
    null,
    {},
    h("button", { onClick: () => checkState.dispatch() }, () =>
      checkState.get() ? "close details" : "open details",
    ),
    () =>
      checkState.get()
        ? items.slice(0, count.get()).map((i) => h("div", {}, i))
        : null,
  );
}

const CountContext = new Context(new State(0));

function TipTapDetails() {
  return h(
    Provider,
    { context: CountContext, value: new State(0) },
    h(TipTap),
    h(Details),
  );
}
mount(h(TipTapDetails), document.body);
