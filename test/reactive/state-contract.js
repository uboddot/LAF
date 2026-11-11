import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Effect } from "../../laf/reactive.js";

export function stateContract(name, make) {
  describe(`${name}: shared State behavior`, () => {
    test("get/peek return the current value", () => {
      // given when
      const { s, update } = make(1);
      // then
      assert.equal(s.get(), 1);
      assert.equal(s.peek(), 1);
      // when
      update(2);
      // then
      assert.equal(s.get(), 2);
      assert.equal(s.peek(), 2);
    });

    test("Effect re-runs on change", () => {
      const { s, update } = make(1);
      let seen;
      new Effect(() => {
        seen = s.get();
      });
      update(2);
      assert.equal(seen, 2);
    });

    test("Effect does not re-run when the value is Object.is-equal", () => {
      const { s, update } = make(1);
      let runs = 0;
      new Effect(() => {
        s.get();
        runs++;
      });
      update(1);
      assert.equal(runs, 1);
    });

    test("render uses renderFn", () => {
      const { s } = make(3, (v) => `#${v}`);
      assert.equal(s.render(), "#3");
    });

    test("render returns plain state if renderFn is not defined", () => {
      const { s } = make("hallo");
      assert.equal(s.render(), "hallo");
    });
  });
}
