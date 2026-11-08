import { test } from "node:test";
import assert from "node:assert/strict";
import { cellWidth } from "./width.ts";

test("ascii and box drawing take one cell", () => {
  for (const ch of ["a", "Z", "0", " ", "[", "+", "\u2500", "\u256d", "\u2591"]) {
    assert.equal(cellWidth(ch.charCodeAt(0)), 1, JSON.stringify(ch));
  }
});

test("full-width CJK takes two cells", () => {
  for (const ch of ["新", "会", "话", "中", "Ａ", "ア", "한"]) {
    assert.equal(cellWidth(ch.charCodeAt(0)), 2, JSON.stringify(ch));
  }
});

test("the wide ranges' own edges are counted", () => {
  assert.equal(cellWidth(0x1100), 2);
  assert.equal(cellWidth(0x115f), 2);
  assert.equal(cellWidth(0x2e80), 2);
  assert.equal(cellWidth(0xac00), 2);
  assert.equal(cellWidth(0xf900), 2);
  assert.equal(cellWidth(0xff01), 2);
  assert.equal(cellWidth(0xff60), 2);
  assert.equal(cellWidth(0x10ff), 1);
  assert.equal(cellWidth(0xff61), 1);
});
