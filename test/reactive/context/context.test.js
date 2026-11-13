import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { Context, Provider } from "../../../laf/context.js";
import { Effect, Owner, withOwner, State } from "../../../laf/reactive.js";

describe("Context.use", () => {
  test("returns the default value when no provider exists", () => {
    const ctx = new Context("default");
    const root = new Owner(null);

    const value = withOwner(root, () => ctx.use());

    assert.equal(value, "default");
  });

  test("returns default value outside of any owner", () => {
    const ctx = new Context("default");

    assert.equal(ctx.use(), "default");
  });

  test("finds a value set on next parent owner", () => {
    const ctx = new Context("default");
    const parent = new Owner(null);
    const child = new Owner(parent);

    parent.contexts.set(ctx, "provided");

    const value = withOwner(child, () => ctx.use());

    assert.equal(value, "provided");

    // when
    const grand_child = new Owner(child);

    // then
    assert.equal(
      withOwner(grand_child, () => ctx.use()),
      "provided",
    );

    // when
    child.contexts.set(ctx, "inner");

    // then
    assert.equal(
      withOwner(child, () => ctx.use()),
      "inner",
    );
    assert.equal(
      withOwner(grand_child, () => ctx.use()),
      "inner",
    );
    assert.equal(
      withOwner(parent, () => ctx.use()),
      "provided",
    );
  });

  test("different contexts are independent", () => {
    // given when
    const themeCtx = new Context("dark");
    const styleCtx = new Context("glasmorphism");
    const aCtx = new Context("a");

    const root = new Owner(null);

    root.contexts.set(themeCtx, "parentTheme");
    root.contexts.set(styleCtx, "parentStyle");

    withOwner(root, () => {
      assert.equal(themeCtx.use(), "parentTheme");
      assert.equal(styleCtx.use(), "parentStyle");
      assert.equal(aCtx.use(), "a");
    });
  });
});

describe("Context inside Effects", () => {
  test("effect still sees the context when it re-runs later", () => {
    const ctx = new Context("default");
    const root = new Owner(null);
    root.contexts.set(ctx, "provided");

    const trigger = new State(0);
    const seen = [];

    withOwner(root, () => {
      new Effect(() => {
        trigger.subscribe();
        seen.push(ctx.use());
      });
    });

    trigger.update(1);

    assert.deepEqual(seen, ["provided", "provided"]);

    //when
    root.contexts.set(ctx, "changed");
    trigger.update(2);

    assert.deepEqual(seen, ["provided", "provided", "changed"]);
  });
});

describe("Provider", () => {
  test("sets the value on the current owner", () => {
    const ctx = new Context("default");
    const root = new Owner(null);

    withOwner(root, () => {
      Provider({ context: ctx, value: "provided" });
      assert.equal(ctx.use(), "provided");
    });
  });

  test("a sibling owner does not see the provided value", () => {
    const ctx = new Context("default");
    const root = new Owner(null);
    const a = new Owner(root);
    const b = new Owner(root);

    withOwner(a, () => Provider({ context: ctx, value: "only a" }));

    assert.equal(
      withOwner(b, () => ctx.use()),
      "default",
    );
  });

  test("throws a helpful error when used outside a component", () => {
    const ctx = new Context("default");

    assert.throws(() => Provider({ context: ctx, value: "provided" }), {
      message: /inside/,
    });
  });

  test("throws when context prop is not a Context", () => {
    const root = new Owner(null);
    assert.throws(() =>
      withOwner(
        root,
        () => Provider({ context: "noCtx", value: "x" }),
        TypeError,
      ),
    );
  });
});
