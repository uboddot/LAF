import { h } from "../laf/index.js";
import { CountContext } from "../contexts.js";
import { linkCSS } from "./util.js";

linkCSS("tiptap.css");

export function TipTap() {
  const counter = CountContext.use();

  return h(
    "div",
    { class: "tiptap" },
    h("button", { onClick: () => counter.set(counter.get() - 1) }, "-"),
    h("div", {}, counter),
    h("button", { onClick: () => counter.set(counter.get() + 1) }, "+"),
  );
}
