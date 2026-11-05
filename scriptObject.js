/**
 * The effect that is currently running
 */
let effectStack = [];

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

  constructor(effect) {
    this.effect = effect;
    effectStack.at(-1)?.addChild(this);
    this.#run();
  }

  addChild(effect) {
    this.#children.add(this);
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
      this.effect();
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

function mount(component, root) {
  root.append(component.render());
}

mount(TipTap(), document.body);

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

function CounterRed() {
  const state = new Reducer((value) => ++value, 2);

  return new LafElement(
    "button",
    { onClick: () => state.dispatch() },
    "Click ",
    state,
    " times",
  ).render();
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
  ).render();
}

function TipTap() {
  const counter = new State(0);

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
  const counter = new Reducer((v) => !v, false);

  let items = ["detail one", "detail two"];

  return h(
    null,
    {},
    h(
      "button",
      {
        onClick: () => counter.dispatch(),
      },
      () => (counter.get() ? "close details" : "open details"),
    ),
    // () => (counter.get() ? h("p", {}, "some details here") : null),
    () => (counter.get() ? items.map((i) => h("div", {}, i)) : null),
  );
}

mount(Details(), document.body);

// document.body.append(Counter(), CounterRed(), Checkbox(), TipTap());
