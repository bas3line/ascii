/*
 * Tests for the ascii.rest scene studio engine.
 * Run with: node --test src/studio/engine.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  compileSceneToPiece,
  createStudioSession,
  compileSceneToCode,
  ALL_PRESETS,
  oceanSunsetPreset,
  snowMountainPreset,
  cyberPrismPreset,
  listLayerDefinitions,
} from "./index.ts";

test("scene studio: layer definitions registry is populated", () => {
  const defs = listLayerDefinitions();
  assert.ok(defs.length >= 4, "should have at least 4 registered layer types");
  const types = defs.map((d) => d.type);
  assert.ok(types.includes("sky"), "should have sky layer");
  assert.ok(types.includes("heightfield"), "should have heightfield layer");
  assert.ok(types.includes("water"), "should have water layer");
  assert.ok(types.includes("particles"), "should have particles layer");
});

test("scene studio: compiles presets into valid Piece conforming to 200x100 contract", () => {
  for (const preset of ALL_PRESETS) {
    const piece = compileSceneToPiece(preset);
    assert.equal(piece.meta.cols, 200, `${preset.name} cols must be 200`);
    assert.equal(piece.meta.rows, 100, `${preset.name} rows must be 100`);
    assert.equal(piece.meta.cell, 1, `${preset.name} cell must be 1 (square grid)`);
    assert.equal(piece.meta.fps, 15, `${preset.name} fps must be 15`);
    assert.equal(piece.meta.category, "scenes", `${preset.name} category must be scenes`);

    const frameFn = piece.default();
    const frame0 = frameFn(0);
    assert.equal(frame0.length, 20000, "frame string must be exactly 20,000 characters");

    // Color buffer test
    const colorBuf = new Uint8Array(20000);
    const frameWithColor = frameFn(1.0, { paper: false, color: colorBuf });
    assert.equal(frameWithColor.length, 20000);

    // Verify colors were written
    let nonZeroColors = 0;
    for (let i = 0; i < colorBuf.length; i++) {
      if (colorBuf[i] !== 0) nonZeroColors++;
    }
    assert.ok(nonZeroColors > 0, "color buffer must have non-zero palette indices");
  }
});

test("scene studio: execution time is under 10ms per 200x100 frame", () => {
  const piece = compileSceneToPiece(oceanSunsetPreset);
  const frameFn = piece.default();
  const colorBuf = new Uint8Array(20000);

  // Warmup
  frameFn(0, { paper: false, color: colorBuf });

  const t0 = performance.now();
  const iterations = 5;
  for (let i = 0; i < iterations; i++) {
    frameFn(i * 0.1, { paper: false, color: colorBuf });
  }
  const elapsed = (performance.now() - t0) / iterations;

  assert.ok(
    elapsed < 15.0,
    `Frame render average ${elapsed.toFixed(2)}ms must be under 15ms budget`
  );
});

test("scene studio: interactive session allows live parameter tweaking and layer toggling", () => {
  const session = createStudioSession(oceanSunsetPreset);
  const initialFrame = session.getFrame(0);
  assert.equal(initialFrame.length, 20000);

  // Toggle water layer off
  session.toggleLayer("water-1", false);
  const withoutWater = session.getFrame(0);
  assert.notEqual(initialFrame, withoutWater, "toggling layer off should change frame");

  // Modify sun position
  session.toggleLayer("water-1", true);
  session.setParam("sky-1", "sunPos", [40, 20]);
  const movedSunFrame = session.getFrame(0);
  assert.notEqual(initialFrame, movedSunFrame, "moving sun should alter frame rendering");
});

test("scene studio: codegen outputs standalone TypeScript piece file", () => {
  const code = compileSceneToCode(snowMountainPreset);
  assert.ok(code.includes('export const meta ='), "must export meta object");
  assert.ok(code.includes('export default function snowMountain(): Frame'), "must export default frame function");
  assert.ok(code.includes('cols: 200'), "code must define cols: 200");
  assert.ok(code.includes('rows: 100'), "code must define rows: 100");
  assert.ok(code.includes('BAYER'), "code must contain Bayer dithering matrix");
  assert.ok(code.includes('nearest'), "code must contain LUT nearest color resolution");
});
