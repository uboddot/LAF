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
    if (v instanceof LafElement) return v;
    if (v instanceof State) return () => v.get();
    if (typeof v === "function") return v;
    return null;
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
      if (read instanceof LafElement) {
        el.append(read.render());
      } else if (read) {
        // const text = document.createTextNode("");
        // new Effect(() => (text.data = read()));
        // el.append(text);
        const anchor = document.createComment("");
        el.append(anchor);
        let current = [];

        new Effect(() => {
          const result = read();
          let node = null;
          if (result instanceof LafElement) node = result.render();
          else if (result != null && result !== false)
            node = document.createTextNode(String(result));

          current.forEach((n) => n.remove());
          current =
            node instanceof DocumentFragment
              ? [...node.childNodes]
              : node
                ? [node]
                : [];
          anchor.after(...current);
        });
      } else if (child == null || child === false) {
        continue;
      } else {
        el.append(child);
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

  return h(
    null,
    {},
    h(
      "button",
      {
        onClick: () => {
          counter.dispatch();
          console.log(counter.peek());
        },
      },
      () => (counter.get() ? "close details" : "open details"),
    ),
    () => (counter.get() ? h("p", {}, "some details here") : null),
  );
}

mount(Details(), document.body);

// document.body.append(Counter(), CounterRed(), Checkbox(), TipTap());
