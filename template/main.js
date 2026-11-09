import { h, mount, Provider, State } from "./laf/index.js";
import { CountContext } from "./contexts.js";
import { TipTap } from "./components/TipTap.js";
import { Details } from "./components/Details.js";

function App() {
  return h(
    null,
    {},
    h("div", {}, h("h1", {}, "Welcome to LAF")),
    h(
      Provider,
      { context: CountContext, value: new State(0) },
      h(TipTap),
      h(Details),
    ),
  );
}

mount(h(App), document.getElementById("app"));
