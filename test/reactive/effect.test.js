import { beforeEach, test, describe } from "node:test";
import assert from "node:assert/strict";

import { State, Effect } from "../../laf/reactive.js";

describe("Effect with one observed state", () => {
  let state;
  let cnt;

  beforeEach(() => {
    state = new State(1);
    cnt = 0;
    new Effect(() => {
      state.subscribe();
      cnt++;
    });
  });

  test("runs once on creation", () => {
    assert.equal(cnt, 1);
  });

  test("re-runs when observed state changes", () => {
    state.update(0);
    assert.equal(cnt, 2);
  });

  test("does not re-run for an Object.is-equal value", () => {
    state.update(1);
    assert.equal(cnt, 1);
  });
});

describe("circular effects", () => {
  test("effect that updates state should not blow up the stack", () => {
    // given when
    const state = new State(1);
    const effect = new Effect(() => {
      state.update(state.subscribe() + 1);
    });

    // then
    assert.equal(state.peek(), 2);
  });

  test("cyclicly linked effect terminate", () => {
    // given
    const a = new State(1);
    const b = new State(1);
    const ef1 = new Effect(() => {
      b.update(a.subscribe() + 1);
    });
    const ef2 = new Effect(() => {
      a.update(b.subscribe() + 1);
    });

    // when
    a.update(2); // duringt effect stack looks like: [ef1, ef2] and ef1 does not get pushed again to the stack, breaking the cycle

    // then
    assert.equal(b.peek(), 3);
    assert.equal(a.peek(), 4);
  });
});

describe("nested effects", () => {
  test("parent effect disposes child on rerun", () => {
    // given when
    const a = new State(1);
    const b = new State(1);
    let cnt_effect_1 = 0;
    let cnt_effect_2 = 0;
    const ef1 = new Effect(() => {
      a.subscribe();
      cnt_effect_1++;
      const ef2 = new Effect(() => {
        a.subscribe();
        b.subscribe();
        cnt_effect_2++;
      });
    });
    /* 
    effectStack now looks like: 
      [ef1
        |
        - ef2]
    */

    // then
    assert.equal(cnt_effect_1, 1);
    assert.equal(cnt_effect_2, 1);

    // when
    a.update(2);

    // then
    assert.equal(cnt_effect_1, 2);
    assert.equal(cnt_effect_2, 2);

    // when
    b.update(2);
    assert.equal(cnt_effect_1, 2);
    assert.equal(cnt_effect_2, 3);
  });

  test("disposal should work its way through generations", () => {
    // given when
    const a = new State(1);
    const b = new State(1);
    let cnt_effect_1 = 0;
    let cnt_effect_2 = 0;
    let cnt_effect_3 = 0;
    const ef1 = new Effect(() => {
      a.subscribe();
      cnt_effect_1++;
      const ef2 = new Effect(() => {
        a.subscribe();
        cnt_effect_2++;
        const ef2 = new Effect(() => {
          a.subscribe();
          cnt_effect_3++;
        });
      });
    });
    /* 
    effectStack now looks like: 
      [ef1
        |
        - ef2
            |
            - ef3]
    */

    // then

    // when
    a.update(2);

    // then
    assert.equal(cnt_effect_1, 2);
    assert.equal(cnt_effect_2, 2);
    assert.equal(cnt_effect_3, 2);
  });

  test("parent reads after child effect, should still run each effect just once", () => {
    // given when
    const a = new State(1);
    const b = new State(1);
    let cnt_effect_1 = 0;
    let cnt_effect_2 = 0;
    const ef1 = new Effect(() => {
      const ef2 = new Effect(() => {
        a.subscribe();
        b.subscribe();
        cnt_effect_2++;
      });
      a.subscribe();
      cnt_effect_1++;
    });

    // then
    assert.equal(cnt_effect_1, 1);
    assert.equal(cnt_effect_2, 1);
  });

  test("child debendency does not trigger parent effect", () => {
    // given when
    const a = new State(1);
    let cnt_effect_1 = 0;
    let cnt_effect_2 = 0;
    const ef1 = new Effect(() => {
      const ef2 = new Effect(() => {
        a.subscribe();
        cnt_effect_2++;
      });
      cnt_effect_1++;
    });

    // then
    assert.equal(cnt_effect_1, 1);
    assert.equal(cnt_effect_2, 1);

    // when
    a.update(2);
    assert.equal(cnt_effect_1, 1);
    assert.equal(cnt_effect_2, 2);
  });

  test("old children dont leak memory", () => {
    // given when
    const a = new State(1);
    const b = new State(1);
    let cnt_effect_1 = 0;
    let cnt_effect_2 = 0;
    const ef1 = new Effect(() => {
      a.subscribe();
      cnt_effect_1++;
      if (a.peek() === 1) {
        const ef2 = new Effect(() => {
          b.subscribe();
          cnt_effect_2++;
        });
      }
    });

    // then
    assert.equal(cnt_effect_1, 1);
    assert.equal(cnt_effect_2, 1);

    // when
    a.update(2);

    // then
    assert.equal(cnt_effect_1, 2);
    assert.equal(cnt_effect_2, 1);

    // when
    b.update(2);

    // then
    assert.equal(cnt_effect_1, 2);
    assert.equal(cnt_effect_2, 1);
  });
});
