import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { Env, Piece } from "./types.ts";

// Colours "#000000" to "#999999", so the colour a glyph is drawn in says which index it was given.
const palette = Array.from({ length: 10 }, (_, i) => "#" + String(i).repeat(6));

// A piece of square cells showing `text(t)`, with `colors` written into env.color.
const piece = (cols: number, rows: number, text: (t: number) => string, colors: number[], fps = 0): Piece => ({
  meta: { name: "test", category: "ui", note: "test", cols, rows, fps, palette, ground: "#000000", cell: 1 },
  default: () => (t: number, env?: Env) => {
    env?.color?.set(colors);
    return text(t);
  },
});

// mount() on a canvas 100px a cell, with the browser stubbed. The atlas records the glyph rasterised into each slot and
// its colour; the canvas records each glyph copied into it, as "glyph colour at column,row+cells", and each cell cleared.
async function onCanvas(t: TestContext, p: Piece) {
  const g = globalThis as Record<string, unknown>;
  const names = ["HTMLCanvasElement", "ResizeObserver", "IntersectionObserver", "document", "devicePixelRatio", "getComputedStyle", "matchMedia", "requestAnimationFrame", "cancelAnimationFrame"];
  const saved = Object.fromEntries(names.map((k) => [k, g[k]]));
  const slots = new Map<string, string>();
  const drawn: string[] = [];
  const cleared: string[] = [];
  const frames: ((now: number) => void)[] = [];
  let seen: ((e: { isIntersecting: boolean }[]) => void) | undefined;
  let slot = "";
  class Canvas {
    style = {};
    clientWidth = 100 * p.meta.cols;
    width = 0;
    height = 0;
    atlas: boolean;
    constructor(atlas = false) {
      this.atlas = atlas;
    }
    getContext() {
      if (this.atlas)
        return {
          fillStyle: "",
          rect: (x: number, y: number) => (slot = `${x + 1},${y + 1}`),
          fillText(this: { fillStyle: string }, ch: string) {
            slots.set(slot, `${ch} ${this.fillStyle}`);
          },
          save() {},
          restore() {},
          beginPath() {},
          clip() {},
          clearRect() {},
        };
      return {
        fillStyle: "",
        fillRect: (x: number, y: number, w: number) => cleared.push(`${x / 100},${y / 100}+${w / 100}`),
        clearRect() {},
        drawImage: (_: unknown, sx: number, sy: number, _sw: number, _sh: number, dx: number, dy: number, dw: number) =>
          drawn.push(`${slots.get(`${sx},${sy}`)} at ${dx / 100},${dy / 100}+${dw / 100}`),
      };
    }
  }
  Object.assign(g, {
    HTMLCanvasElement: Canvas,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      constructor(cb: typeof seen) {
        seen = cb;
      }
      observe() {}
      disconnect() {}
    },
    document: { hidden: false, createElement: () => new Canvas(true), addEventListener() {}, removeEventListener() {} },
    devicePixelRatio: 1,
    getComputedStyle: () => ({ color: "rgb(0, 0, 0)" }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: (cb: (now: number) => void) => frames.push(cb),
    cancelAnimationFrame: () => {},
  });
  const { mount } = await import("./mount.ts");
  const stop = mount(new Canvas() as unknown as HTMLElement, p);
  t.after(() => {
    stop();
    Object.assign(g, saved);
  });
  return {
    drawn,
    cleared,
    /** Plays the next frame, a tenth of a second on. */
    tick() {
      seen?.([{ isIntersecting: true }]);
      frames.shift()?.(performance.now() + 100);
    },
  };
}

test("a canvas draws each character in its own cell's colour, on every row", async (t) => {
  const { drawn } = await onCanvas(t, piece(3, 3, () => "abc\ndef\nghi", [0, 1, 2, 3, 4, 5, 6, 7, 8]));
  assert.deepEqual(
    drawn,
    [..."abcdefghi"].map((ch, i) => `${ch} ${palette[i]} at ${i % 3},${Math.floor(i / 3)}+1`),
  );
});

test("a full-width character takes two cells, and the characters after it keep their own colours", async (t) => {
  // meta.cols counts characters: 新 takes two cells, so the row's last character, a space, does not fit and is dropped.
  const { drawn } = await onCanvas(t, piece(4, 2, () => "新AB \nabcd", [1, 2, 3, 4, 5, 6, 7, 8]));
  assert.deepEqual(drawn, [
    `新 ${palette[1]} at 0,0+2`,
    `A ${palette[2]} at 2,0+1`,
    `B ${palette[3]} at 3,0+1`,
    `a ${palette[5]} at 0,1+1`,
    `b ${palette[6]} at 1,1+1`,
    `c ${palette[7]} at 2,1+1`,
    `d ${palette[8]} at 3,1+1`,
  ]);
});

test("a cell a character moves out of is cleared when a wide character before it narrows", async (t) => {
  const c = await onCanvas(t, piece(3, 1, (t) => (t ? "aA " : "新A "), [1, 1, 1], 30));
  assert.deepEqual(c.drawn, [`新 ${palette[1]} at 0,0+2`, `A ${palette[1]} at 2,0+1`]);
  c.drawn.length = c.cleared.length = 0;
  c.tick();
  assert.deepEqual(c.drawn, [`a ${palette[1]} at 0,0+1`, `A ${palette[1]} at 1,0+1`]);
  assert.deepEqual(c.cleared, ["0,0+1", "1,0+1", "2,0+1"]);
});
