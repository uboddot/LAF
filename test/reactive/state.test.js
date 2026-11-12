import { test } from "node:test";
import assert from "node:assert/strict";

import { Reducer, State } from "../../laf/reactive.js";

import { stateContract } from "./state-contract.js";

stateContract("State", (initial, renderFn) => {
  const state = new State(initial, renderFn);
  return { s: state, update: (v) => state.update(v) };
});

stateContract("Reducer", (initial, renderFn) => {
  let next;
  const reducer = new Reducer(() => next, initial, renderFn);
  return {
    s: reducer,
    update: (v) => {
      next = v;
      reducer.dispatch();
    },
  };
});

test("State stores and updates a value", () => {
  // given when
  const state = new State(0);
  // then
  assert.equal(state.peek(), state.subscribe());

  //when
  state.update(1);
  assert.equal(state.subscribe(), 1);
});

test("A state gets rendered correctly", () => {
  // given when
  const state = new State(0, () => 1);

  // then
  assert.equal(state.render(), 1);

  // given when
  const state2 = new State(0);

  // then
  assert.equal(state2.render(), state2.subscribe());
});
