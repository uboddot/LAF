import { h, mount, State } from "./laf/index.js";

function App() {
  const count = new State(0);

  return h(
    "main",
    {},
    h("h1", {}, "Hello LAF"),
    h(
      "button",
      { onclick: () => count.set(count.peek() + 1) },
      () => `Clicked ${count.get()} times`,
    ),
  );
}

mount(h(App), document.getElementById("app"));
