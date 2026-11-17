/**
 * DOM rendering
 * @module dom
 */
import { Effect, Owner, State, owner, withOwner } from "./reactive.js";

export { h, mount };

const SVG_NS = "http://www.w3.org/2000/svg";
const HTML_NS = "http://www.w3.org/1999/xhtml";

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
    if (v instanceof State) return () => v.render();
    if (typeof v === "function") return v;
    return null;
  }

  /**
   * Turns child values into DOM nodes.
   * @param {any} value
   * @param {string} ns namespace for LafElements created from value
   * @returns {Node[]}
   */
  static #toNodes(value, ns) {
    if (value == null || value === false) return [];
    if (Array.isArray(value))
      return value.flatMap((v) => LafElement.#toNodes(v, ns));
    if (value instanceof LafElement) {
      const node = value.render(ns);
      return node instanceof DocumentFragment ? [...node.childNodes] : [node];
    }
    if (value instanceof Node) return [value];
    return [document.createTextNode(String(value))];
  }

  // calls nested LafElements recursively
  render(ns = HTML_NS) {
    const myNs = this.tag === "svg" ? SVG_NS : ns; // own namespace: <svg> switches to SVG, otherwise inherit

    // catching Components, i.e. App(), Provider() etc.
    if (typeof this.tag === "function") {
      return withOwner(new Owner(owner), () =>
        this.tag(this.props, ...this.children).render(ns),
      );
    }

    const el =
      this.tag === null
        ? document.createDocumentFragment()
        : myNs === SVG_NS
          ? document.createElementNS(SVG_NS, this.tag)
          : document.createElement(this.tag);

    const childNs = this.tag === "foreignObject" ? HTML_NS : myNs;

    // handle props
    if (this.tag != null) {
      for (const [k, v] of Object.entries(this.props)) {
        const read = LafElement.#reader(v);

        const assign = (value) => {
          // SVG name space always sets with Attribute.
          if (myNs !== SVG_NS && k in el) {
            el[k] = value;
          } // DOM property: checked, value, disabled, ...
          else if (value == null || value === false) {
            el.removeAttribute(k);
          } else {
            el.setAttribute(k, value);
          } // plain attribute: class, aria-*, data-*, ..., svg attr.
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
          const next = LafElement.#toNodes(read(), childNs);
          current.forEach((n) => n.remove());
          anchor.after(...next);
          current = next;
        });
      } else {
        el.append(...LafElement.#toNodes(child, childNs));
      }
    }

    return el;
  }
}

const h = (tag, props, ...children) => new LafElement(tag, props, ...children);

function mount(component, root) {
  root.append(component.render());
}
