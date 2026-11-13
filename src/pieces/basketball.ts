/*
 * basketball: a spinning ball that bounces lower each time and squashes
 * against the floor, with seams drawn on the rotating surface.
 */
import type { Frame, Meta, Piece } from "../types.ts";

/** The bounces and final rest must fit within a 30-second loop. */
export interface BasketballOptions {
  [key: string]: unknown;
  /** Uncompressed radius in character rows (1 to 15), fitted to the frame. */
  radius: number;
  /** Downward acceleration in rows per second squared (1 to 300). */
  gravity: number;
  /** First takeoff speed in rows per second (1 to 60). */
  launchSpeed: number;
  /** Fraction of takeoff speed retained for the next bounce (0 to 0.95). */
  restitution: number;
  /** Seconds on the floor after the final bounce (0 to 10). */
  restSeconds: number;
  /** Maximum horizontal expansion as a fraction of the radius (0 to 1). */
  maxSpread: number;
  /** Maximum vertical compression as a fraction of the radius (0 to 0.9). */
  maxSquash: number;
  /** Shading glyphs from lightest to densest, starting with a space. */
  ramp: string;
}

const DEFAULTS = {
  radius: 11.5,
  gravity: 47,
  launchSpeed: 23,
  restitution: 0.74,
  restSeconds: 0.65,
  maxSpread: 0.055,
  maxSquash: 0.08,
  ramp: " .:-=+*#%@",
} satisfies BasketballOptions;

const MAX_LOOP_SECONDS = 30;
const TAU = 2 * Math.PI;
const SAMPLE_X = [-0.125, 0.125];
const SAMPLE_Y = [-0.25, 0.25];
// Fixed seam orientation: screen-plane tilt and pitch, in radians.
const TILT_COS = Math.cos(0.35), TILT_SIN = Math.sin(0.35);
const PITCH_COS = Math.cos(0.245), PITCH_SIN = Math.sin(0.245);

function bounceSchedule({ gravity, launchSpeed, restitution, restSeconds }: BasketballOptions) {
  const bounces: { start: number; land: number; end: number; speed: number }[] = [];
  let end = 0;
  let speed = launchSpeed;
  // The first bounce always runs; later bounces stop below 4 rows per second.
  do {
    const start = end;
    const land = start + (2 * speed) / gravity;
    // Ground contact lasts 0.10 to 0.18 seconds, depending on impact speed.
    end = land + 0.1 + 0.08 * (speed / launchSpeed);
    bounces.push({ start, land, end, speed });
    speed *= restitution;
  } while (speed >= 4);
  const loop = end + restSeconds;
  // SVG export samples the whole loop before checking its byte budget.
  if (loop > MAX_LOOP_SECONDS) {
    throw new RangeError(`basketball: the bounce and rest loop must be at most ${MAX_LOOP_SECONDS} seconds`);
  }
  return { bounces, loop };
}

export const meta = {
  name: "basketball",
  category: "objects",
  note: "a basketball spinning and bouncing lower with each landing",
  cols: 64,
  rows: 32,
  fps: 30,
  loop: bounceSchedule(DEFAULTS).loop,
  options: DEFAULTS,
} satisfies Meta<BasketballOptions>;

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function settings(options: Partial<BasketballOptions>, defaults = DEFAULTS): BasketballOptions {
  const ramp = options.ramp;
  const validRamp = typeof ramp === "string" && ramp.startsWith(" ") && ramp.trimEnd().length > 0
    && !/[^\x20-\x7e·°\u2500-\u259f]/u.test(ramp);
  return {
    radius: bounded(options.radius, defaults.radius, 1, meta.rows / 2 - 1),
    gravity: bounded(options.gravity, defaults.gravity, 1, 300),
    launchSpeed: bounded(options.launchSpeed, defaults.launchSpeed, 1, 60),
    restitution: bounded(options.restitution, defaults.restitution, 0, 0.95),
    restSeconds: bounded(options.restSeconds, defaults.restSeconds, 0, 10),
    maxSpread: bounded(options.maxSpread, defaults.maxSpread, 0, 1),
    maxSquash: bounded(options.maxSquash, defaults.maxSquash, 0, 0.9),
    ramp: validRamp ? ramp : defaults.ramp,
  };
}

export default function basketball(options: Partial<BasketballOptions> = {}): Frame {
  return drawBasketball(settings(options));
}

/** Compute the same loop that the renderer uses for these options. */
export function loopDuration(options: Partial<BasketballOptions> = {}): number {
  return bounceSchedule(settings(options)).loop;
}

/** Configure a piece with its own defaults for playback and SVG export. */
export function createBasketball(options: Partial<BasketballOptions> = {}): Piece<BasketballOptions> {
  const config = settings(options);
  return {
    meta: { ...meta, loop: bounceSchedule(config).loop, options: config },
    loopDuration: (overrides = {}) => bounceSchedule(settings(overrides, config)).loop,
    default: (overrides = {}) => drawBasketball(settings(overrides, config)),
  };
}

function drawBasketball(config: BasketballOptions): Frame {
  const { bounces, loop } = bounceSchedule(config);
  const { cols, rows } = meta;
  const { gravity, launchSpeed, maxSpread, maxSquash, ramp } = config;
  const floor = rows - 1;
  // Reserve room for the first jump and the widest landing. Scale the
  // trajectory uniformly if its peak exceeds the available vertical space.
  const radius = Math.min(config.radius, cols / (4 * (1 + maxSpread)));
  const heightScale = Math.min(1, (floor - 2 * radius) / (launchSpeed ** 2 / (2 * gravity)));
  const left = Array.from({ length: cols }, (_, c) => (c + 0.5 - cols / 2) / 2);
  const output = new Array<string>(rows);

  return (t, { paper = false } = {}) => {
    const elapsed = ((t % loop) + loop) % loop;
    const bounce = bounces.find(({ end }) => elapsed < end);
    let height = 0;
    let squash = 0;
    if (bounce) {
      if (elapsed < bounce.land) {
        const air = elapsed - bounce.start;
        height = air * (bounce.speed - gravity * air / 2) * heightScale;
      } else {
        const contact = (elapsed - bounce.land) / (bounce.end - bounce.land);
        squash = (bounce.speed / launchSpeed) * Math.sin(Math.PI * contact);
      }
    }

    // Keep the bottom of the ellipse on the floor throughout contact.
    const rx = radius * (1 + maxSpread * squash);
    const ry = radius * (1 - maxSquash * squash);
    const cy = floor - height - ry;
    // Start with a visible seam and complete one turn per motion period.
    const angle = 0.55 + (TAU * elapsed) / loop;
    const sin = Math.sin(angle), cos = Math.cos(angle);

    for (let r = 0; r < rows; r++) {
      let line = "";
      for (const x of left) {
        let ink = 0;
        // Four subcell samples keep the silhouette and narrow seams legible.
        for (const dy of SAMPLE_Y) {
          const v = (cy - r - 0.5 - dy) / ry;
          for (const dx of SAMPLE_X) {
            const u = (x + dx) / rx;
            const depth = 1 - u * u - v * v;
            if (depth <= 0) continue;
            const w = Math.sqrt(depth);

            // Undo the tilt and spin before measuring distance to the seams.
            const tiltedX = TILT_COS * u + TILT_SIN * v;
            const tiltedY = TILT_COS * v - TILT_SIN * u;
            const seamX = tiltedX * cos - w * sin;
            const seamY = PITCH_COS * tiltedY - PITCH_SIN * (tiltedX * sin + w * cos);
            const distance = Math.min(Math.abs(seamX), Math.abs(seamY), Math.abs(Math.abs(seamX) - 0.69));
            const seam = Math.min(1, Math.max(0, (distance - 0.018) / 0.048));
            const light = Math.max(0, -0.45 * u + 0.5 * v + 0.74 * w);
            const tone = 0.24 + 0.72 * light;
            const surface = tone * (0.36 + 0.64 * seam);
            ink += paper ? 1.05 - surface : surface;
          }
        }
        line += ramp[Math.round(ink * (ramp.length - 1) / 4)];
      }
      output[r] = line;
    }
    return output.join("\n");
  };
}
