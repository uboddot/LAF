import { Effect, Owner, State, owner, withOwner } from "./reactive.js";

export { h, mount };

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

const h = (tag, props, ...children) => new LafElement(tag, props, ...children);

function mount(component, root) {
  root.append(component.render());
}
