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
      checkState.subscribe() ? "close details" : "open details",
    ),
    () =>
      checkState.subscribe()
        ? items.slice(0, count.subscribe()).map((i) => h("div", {}, i))
        : null,
  );
}
