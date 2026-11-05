/**
 * The effect that is currently running
 */
let effectStack = [];

function signal(value) {
  // list of all the subscribers
  const subs = new Set();

  // add a subscriber
  const read = () => {
    if (effectStack.length > 0) subs.add(effectStack.at(-1));
    return value;
  };

  // updates subscribers
  const write = (nextValue) => {
    value = nextValue;
    [...subs].forEach((fn) => fn());
  };

  return [read, write];
}

function effect(fn) {
  const run = () => {
    effectStack.push(run);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  };
  run();
}

function h(tag, props, ...children) {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(props ?? {})) {
    if (k.startsWith("on")) {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (typeof v === "function") {
      effect(() => el.setAttribute(k, v()));
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (typeof c === "function") {
      const text = document.createTextNode("");
      effect(() => (text.data = c()));
      el.append(text);
    } else {
      el.append(c);
    }
  }
  return el;
}

function Counter() {
  const [count, setCount] = signal(0);

  return h(
    "button",
    { onClick: () => setCount(count() + 1) },
    "Clicked ",
    count,
    " times",
  );
}

document.body.append(Counter());
