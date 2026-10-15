# ascii.rest/studio: the spec

The studio is the engine and authoring environment for animated ascii scenes in
`ascii.rest`.

Until now, every scene in `src/pieces` (34 scenes from `alpine-dawn` to
`volcano-night`) was hand-rolled as an isolated, hardcoded closure. While
visually stunning, they could not be edited interactively, parameterized,
customized with sliders, or generated from source images.

The studio changes this by introducing an extensible, layer-based scene engine
in `src/studio/`. A scene is represented as a declarative specification
(`SceneSpec`) composed of modular, parameterized layers (sky, terrain, water,
particles, image planes). The engine executes the scene at 15 fps on a 200x100
grid, exposes a runtime parameter schema for live interactive editing, and
compiles any scene into a standalone, zero-dependency TypeScript piece ready for
`ascii.rest` or direct embedding.

---

## 1. Universal Scene Contract

Every scene produced by or played within the studio strictly adheres to the
`ascii.rest` scene contract:

| Property | Value | Contract |
| :--- | :--- | :--- |
| **Columns** | `200` | Fixed width. |
| **Rows** | `100` | Fixed height. Total cells = 20,000. |
| **Cell Aspect** | `1` | Square cells (1:1), yielding an exact 2:1 widescreen aspect ratio. |
| **Frame Rate** | `15` | Target 15 fps. Budget: < 6.0 ms per frame on average. |
| **Halftone** | `" ·•●"` | 4 density levels (0%, 30%, 60%, 100% cell ink). |
| **Dithering** | Bayer 4x4 | `[0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] / 16 - 0.47` |
| **Palette** | 20 to 50 hex colors | Curated gradient and silhouette colors + base `ground` color. |
| **Color Cache**| 32,768-entry LUT | 15-bit RGB nearest-match lookup table (`Uint8Array(32768)`). |

---

## 2. Architecture & Module Layout

The studio consists of two cleanly decoupled subsystems:
1. **The Engine (`src/studio/`)**: Pure TypeScript library, zero UI dependencies, runs in Node, browser, and Web Workers.
2. **The Surface (`site/src/pages/studio.astro`)**: High-density, understated instrument panel built with Astro and vanilla JavaScript.

```
src/studio/
  ├── SPEC.md             # This specification
  ├── types.ts            # SceneSpec, LayerSpec, ParamSchema, Context
  ├── halftone.ts         # Bayer dithering, glyph ramps, 15-bit RGB LUT
  ├── engine.ts           # Runtime compiler: SceneSpec -> Piece
  ├── codegen.ts          # Compiles SceneSpec -> standalone .ts piece file
  ├── presets.ts          # Built-in engine scene presets
  ├── index.ts            # Public entry point for ascii.rest/studio
  └── layers/
      ├── registry.ts     # Layer type registry and schema definitions
      ├── sky.ts          # Atmosphere, sun/moon, gradients, haze, stars
      ├── heightfield.ts  # Mountains, ridges, architecture, silhouettes
      ├── water.ts        # Fluid planes, Gerstner waves, sun glare path
      ├── particles.ts    # Multi-depth parallax snow, rain, embers, smoke
      └── image.ts        # Image ingestion, depth segmentation, motion overlay
```

---

## 3. Data Model & Types (`types.ts`)

### 3.1. Parameter Descriptors
Every layer exposes a typed schema describing its tunable parameters. This
allows any UI (sliders, toggles, color pickers) to be auto-generated without
hardcoded controls:

```ts
export type ParamType = "number" | "color" | "vec2" | "select" | "boolean";

export interface NumberParamDef {
  type: "number";
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface ColorParamDef {
  type: "color";
  label: string;
  default: string; // hex
}

export interface Vec2ParamDef {
  type: "vec2";
  label: string;
  default: [number, number];
  min: [number, number];
  max: [number, number];
  step?: number;
}

export interface SelectParamDef {
  type: "select";
  label: string;
  default: string;
  options: { label: string; value: string }[];
}

export interface BooleanParamDef {
  type: "boolean";
  label: string;
  default: boolean;
}

export type ParamDef =
  | NumberParamDef
  | ColorParamDef
  | Vec2ParamDef
  | SelectParamDef
  | BooleanParamDef;

export type ParamSchema = Record<string, ParamDef>;
export type ParamValues = Record<string, any>;
```

### 3.2. Layer Specification
A layer defines its type, custom name, enabled state, and active parameter values:

```ts
export interface LayerSpec {
  id: string;
  type: "sky" | "heightfield" | "water" | "particles" | "image" | string;
  name: string;
  enabled: boolean;
  params: ParamValues;
}
```

### 3.3. Scene Specification
The complete serialized blueprint of a scene:

```ts
export interface SceneSpec {
  name: string;
  note?: string;
  ground: string;               // Base ground hex (e.g. "#0b0817")
  palette: string[];            // 20-50 color hex array
  fps?: number;                 // Default 15
  halftone?: {
    ramp?: string;              // Default " ·•●"
    dither?: "bayer4" | "bayer8" | "none";
    contrast?: number;          // 0.5 to 2.0
  };
  layers: LayerSpec[];
}
```

---

## 4. Layer Execution Pipeline

A frame is computed by composing active layers from back to front into intermediate
floating-point color and depth buffers, followed by a unified halftone rasterization pass.

```
                      +-------------------+
                      |   t (seconds)     |
                      +---------+---------+
                                |
             +------------------+------------------+
             |                  |                  |
     [Layer 0: Sky]    [Layer 1: Terrain]   [Layer 2: Water]
             |                  |                  |
             +------------------+------------------+
                                |
                   Composite Buffers (R, G, B, Z)
                                |
                  Halftone Peak & Coverage Calc
                                |
                   4x4 Bayer Matrix Dithering
                                |
                  15-bit LUT Palette Resolution
                                |
                       Output Frame (2:1)
```

### 4.1. The Layer Contract
Every layer module implements `LayerDefinition`:

```ts
export interface RenderContext {
  t: number;                    // Current animation time in seconds
  cols: number;                 // Always 200
  rows: number;                 // Always 100
  paletteRgb: number[][];       // Normalized [[r, g, b], ...] in 0..1
  nearestColor: (r: number, g: number, b: number) => number;
}

export interface LayerInstance {
  init(ctx: RenderContext, params: ParamValues): void;
  render(
    ctx: RenderContext,
    params: ParamValues,
    bufR: Float32Array,
    bufG: Float32Array,
    bufB: Float32Array,
    bufDepth: Float32Array
  ): void;
}

export interface LayerDefinition {
  type: string;
  label: string;
  schema: ParamSchema;
  create(): LayerInstance;
}
```

---

## 5. Built-in Layers

### 5.1. `sky` (Atmosphere & Celestial Bodies)
- **Sun / Moon**: Position `(x, y)`, radius, color, glare falloff rate.
- **Gradient**: Horizon row `hz`, sky stops (zenith to horizon), solar warm bias.
- **Haze & Noise**: Atmospheric banding via low-frequency 2D value noise / fbm.
- **Stars**: Seeded twinkling celestial starfield with brightness modulation.

### 5.2. `heightfield` (Silhouettes & Architecture)
- **Ridge Curve**: Base equation with smoothstep transitions, exponential peaks, and fbm strata.
- **Surface Lighting**: Slope-dependent shading reacting to solar direction.
- **Stratification**: Strata frequency, rock roughness, silhouette tone falloff.

### 5.3. `water` (Fluids & Horizons)
- **Horizon & Plane**: Elevation start row to bottom row with perspective depth scaling.
- **Gerstner Swells**: 4-harmonic wind chop `[dir_x, dir_z, wavenumber, slope, speed, phase]`.
- **Solar Glitter Path**: Specular streak aligned with sun column with exponential cross-axis falloff.
- **Sky Mirroring**: Inverted sky color reflection weighted by surface normal angle (Fresnel).

### 5.4. `particles` (Weather & Atmosphere)
- **Type**: Snow, rain, embers, or smoke.
- **Parallax Depths**: 3 independent depth planes with distinct velocities and dot sizes.
- **Turbulence**: Wind vector modulated by harmonic drift.

### 5.5. `image` (Photo Ingestion & Living Scenes)
- **Ingestion**: 200x100 pixel buffer from dropped raster image.
- **Segmentation**: Sky threshold, silhouette boundary, ground/water plane.
- **Palette**: Auto-extracted via K-means clustering (32 colors) + auto ground selection.
- **Motion Synthesis**: Injects harmonic wave chop on lower plane and drifting noise on upper plane.

---

## 6. Code Generation Engine (`codegen.ts`)

The studio is not a walled garden: any designed or edited scene can be compiled
into a production-ready, standalone TypeScript piece file that imports nothing
from the studio and conforms directly to `src/pieces/`:

```ts
import { compileSceneToCode } from "ascii.rest/studio";

const tsCode = compileSceneToCode(sceneSpec);
// Outputs standalone TypeScript file with meta, precomputed static arrays,
// hot frame loop, Bayer matrix, and LUT cache.
```

---

## 7. Studio UI/UX Principles (`site/src/pages/studio.astro`)

The studio UI follows strict design guidelines:
1. **Instrument, Not Brochure**: Zero promotional copy, zero developer fluff, zero wasted whitespace.
2. **Sharp & Understated**: `border-radius: 0`, crisp 1px borders (`var(--well)`), monospace typography (`var(--mono)`).
3. **Viewport Front and Center**: The 200x100 canvas commands primary focus with real-time responsive scaling.
4. **Instant Dynamic Controls**: Parameter changes update the live canvas with zero latency.
5. **Timeline Cockpit**: Frame scrubber, play/pause toggle, and playback speed multiplier (0.25x to 2x).
6. **Tabs for Workflow**:
   - `[scenes]`: Instant preset switcher.
   - `[layers]`: Layer tree, visibility toggles, and live parameter sliders.
   - `[palette]`: Interactive color swatch grid and ground picker.
   - `[image]`: Drop photo to synthesize scene.
   - `[export]`: Code generator (TypeScript, React, SVG, CLI).
