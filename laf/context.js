import { owner } from "./reactive.js";
import { h } from "./dom.js";

export { Context, Provider };

/**
 * Holds default value for a context.
 *
 * Provides a use function to travers a "owner-tree" and find a context otherwise return default value.
 */
class Context {
  constructor(defaultValue) {
    this.defaultValue = defaultValue;
  }

  /**
   * Use this context in the next ancestor, otherwise default.
   *
   * @returns {any} context if present in ancestors or default value.
   */
  use() {
    for (let o = owner; o; o = o.parent) {
      if (o.contexts.has(this)) return o.contexts.get(this);
    }
    return this.defaultValue;
  }
}

/**
 * Sets the value for a context in its parent
 * @param {*} param0
 * @param  {...any} children
 * @returns the LafElement of its children
 */
function Provider({ context, value }, ...children) {
  if (!owner) {
    throw new Error(
      "Provider must be called inside a component! Owner was null.",
    );
  }
  if (!(context instanceof Context)) {
    throw new TypeError("Provider: 'context' prop must be instance of Context");
  }
  owner.contexts.set(context, value);
  return h(null, null, ...children);
}
