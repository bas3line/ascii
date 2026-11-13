import assert from "node:assert/strict";
import { test } from "node:test";
import * as basketball from "./pieces/basketball.ts";
import { loopOf, svg } from "./svg.ts";

test("basketball SVG uses the effective loop without changing configured defaults", () => {
  const { createBasketball } = basketball;
  const piece = createBasketball({ gravity: 60, restSeconds: 1 });
  const overrides = { restSeconds: 5 };
  const original = piece.meta.loop;
  const expected = createBasketball({ gravity: 60, ...overrides }).meta.loop;

  assert.equal(loopOf(piece, overrides).every, expected);
  assert(svg(piece, { options: overrides, fps: 2 }).includes(`animation:${expected}s `));
  assert(svg(piece, { options: overrides, seconds: 2, fps: 2 }).includes("animation:2s "));
  assert.equal(loopOf(piece).every, original);
  assert.equal(piece.meta.options?.restSeconds, 1);
  assert.equal(loopOf(basketball, overrides).every, createBasketball(overrides).meta.loop);
  assert.throws(
    () => svg(piece, { options: { gravity: 1, launchSpeed: 60, restitution: 0.95 } }),
    /at most 30 seconds/,
  );
});
