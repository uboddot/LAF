import { owner } from "./reactive.js";
import { h } from "./dom.js";

export { Context, Provider };

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
