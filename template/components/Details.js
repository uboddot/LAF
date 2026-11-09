import { h, Reducer } from "../laf/index.js";
import { CountContext } from "../contexts.js";

export function Details() {
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
