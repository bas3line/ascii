/*
 * mount: plays an ascii piece in a <pre>, or on a <canvas> in colour.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 * In a <pre> every piece is text in the pre's own colour, a coloured one too.
 * On a <canvas> it is drawn in its palette (or the canvas's text colour,
 * without one) over `meta.ground`, or over the page when it has none, filling
 * the canvas's width with cells `meta.cell` widths tall: 2 by default, the
 * shape of a character, or 1 for a square grid.
 *
 * Play time only advances while the element is on screen and the tab is open,
 * and prefers-reduced-motion holds it still, on the frame at `meta.still` or
 * else the first, unless `motion` is set (for a page that offers its own play
 * control). Returns a stop function.
 *
 *   import { mount } from "ascii.rest";
 *   import { donut } from "ascii.rest/pieces";
 *   const stop = mount(document.querySelector("pre")!, donut);
 */
import type { Env, Frame, Meta, Options, Piece } from "./types.ts";

/**
 * The piece's option overrides, `fps` to override its frame rate, and `motion`
 * to play even when the reader prefers reduced motion: only for a page that
 * offers its own control, such as a play button the reader presses.
 */
export type MountOptions = Options & { fps?: number; motion?: boolean };

export function mount(el: HTMLElement, piece: Piece | Piece["default"], options: MountOptions = {}): () => void {
  const make = typeof piece === "function" ? piece : piece.default;
  const meta: Partial<Meta> = typeof piece === "function" ? {} : piece.meta;
  const { fps = meta.fps ?? 30, motion = false, ...rest }: MountOptions = { ...meta.options, ...options };
  const frame: Frame = make(rest);
  const { cols = 80, rows = 24, palette, ground, cell = 2 } = meta;
  const canvas = el instanceof HTMLCanvasElement ? el : null;
  // Colour only on a canvas: in a <pre> a coloured piece is text in one ink too.
  const color = palette && canvas ? new Uint8Array(cols * rows) : undefined;

  const rgb = (css: string) => (css[0] === "#" ? [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16)) : (css.match(/[\d.]+/g) || []).map(Number));
  const dark = (css: string) => {
    const c = rgb(css);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 128;
  };
  const env = (): Env => ({ paper: canvas && ground ? !dark(ground) : dark(getComputedStyle(el).color), color });
  // Held still for reduced motion, it shows the moment the piece names for that: every letter of a typed banner.
  // matchMedia is checked for: a still piece needs nothing else of a browser's, and may be drawn where there is none.
  const reduced = !motion && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = reduced ? (meta.still ?? 0) : 0;
  let draw = () => {
    el.textContent = frame(t, env());
  };

  // On a canvas each (character, colour) pair is drawn once into an atlas and
  // copied from there into its cell, and a frame redraws only the cells that
  // changed since the last one: on a phone a scene's 20,000 copies a frame were
  // most of its time. Each cell is copied inside its own whole-pixel rectangle,
  // so cells tile exactly and redrawing one never touches its neighbours.
  let ro: ResizeObserver | undefined;
  if (canvas) {
    const font = (px: number) => `${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const ctx = canvas.getContext("2d")!;
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d")!;
    const slots = new Map<number, number>();
    // A slot is a glyph's box with a pixel of clear space round it, which a cell's rectangle may reach into.
    let w = 0, h = 0, sw = 0, sh = 0, pw = 0, ph = 0, width = -1, ink = "";
    // Each column's and row's whole-pixel edges, and where its glyph's box starts.
    let xs = new Int32Array(0), ys = new Int32Array(0), gx = new Int32Array(0), gy = new Int32Array(0);
    let last = "", full = true;
    const lastColor = color && new Uint8Array(cols * rows);
    canvas.style.display ||= "block";
    canvas.style.width ||= "100%";
    canvas.style.aspectRatio = `${cols} / ${rows * cell}`;
    const size = () => {
      width = canvas.clientWidth;
      w = (width * (devicePixelRatio || 1)) / cols;
      h = w * cell;
      sw = Math.ceil(w);
      sh = Math.ceil(h);
      pw = sw + 2;
      ph = sh + 2;
      canvas.width = Math.round(w * cols);
      canvas.height = Math.round(h * rows);
      atlas.width = pw * 32;
      atlas.height = ph * 32;
      xs = Int32Array.from({ length: cols + 1 }, (_, x) => Math.round(x * w));
      ys = Int32Array.from({ length: rows + 1 }, (_, y) => Math.round(y * h));
      gx = Int32Array.from({ length: cols }, (_, x) => Math.round(x * w + (w - sw) / 2));
      gy = Int32Array.from({ length: rows }, (_, y) => Math.round(y * h + (h - sh) / 2));
      slots.clear();
      full = true;
    };
    const glyph = (code: number, i: number) => {
      const key = code * 256 + i;
      let s = slots.get(key);
      if (s !== undefined) return s;
      if (slots.size === 1024) {
        actx.clearRect(0, 0, atlas.width, atlas.height);
        slots.clear();
      }
      s = slots.size;
      const x = (s % 32) * pw + 1, y = Math.floor(s / 32) * ph + 1;
      actx.font = font(w / 0.6);
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      actx.fillStyle = palette ? palette[i] || palette[0] : ink;
      // Kept to its slot: a box drawing glyph stands taller than its box and would reach into the slot below, which
      // the cells of that slot's glyph would then show.
      actx.save();
      actx.beginPath();
      actx.rect(x - 1, y - 1, pw, ph);
      actx.clip();
      actx.fillText(String.fromCharCode(code), x + sw / 2, y + sh / 2);
      actx.restore();
      slots.set(key, s);
      return s;
    };
    draw = () => {
      if (!palette && getComputedStyle(canvas).color !== ink) {
        ink = getComputedStyle(canvas).color;
        slots.clear();
        actx.clearRect(0, 0, atlas.width, atlas.height);
        full = true;
      }
      const text = frame(t, env());
      if (ground) ctx.fillStyle = ground;
      if (full) {
        if (ground) ctx.fillRect(0, 0, canvas.width, canvas.height);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      for (let k = 0, x = 0, y = 0; k < text.length; k++) {
        const c = text.charCodeAt(k);
        if (c === 10) {
          x = 0;
          y++;
          continue;
        }
        const i = y * cols + x;
        if (full || c !== last.charCodeAt(k) || (color && color[i] !== lastColor![i])) {
          const x0 = xs[x], y0 = ys[y], cw = xs[x + 1] - x0, ch = ys[y + 1] - y0;
          if (!full) {
            if (ground) ctx.fillRect(x0, y0, cw, ch);
            else ctx.clearRect(x0, y0, cw, ch);
          }
          if (c !== 32) {
            const s = glyph(c, color ? color[i] : 0);
            // the cell's own rectangle of the glyph's slot, the glyph's box placed where it always sits
            ctx.drawImage(atlas, (s % 32) * pw + 1 + x0 - gx[x], Math.floor(s / 32) * ph + 1 + y0 - gy[y], cw, ch, x0, y0, cw, ch);
          }
        }
        x++;
      }
      last = text;
      if (color) lastColor!.set(color);
      full = false;
    };
    size();
    ro = new ResizeObserver(() => {
      if (canvas.clientWidth !== width) {
        size();
        draw();
      }
    });
    ro.observe(canvas);
  }
  draw();
  if (!fps) return () => ro?.disconnect();

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  let last = 0;
  let seen = false;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = now - last;
    if (dt < 1000 / fps - 2) return;
    last = now;
    t += Math.min(dt, 100) / 1000;
    draw();
  };
  const run = () => {
    const go = seen && !document.hidden && (motion || !still.matches);
    if (go && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!go && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver((entries) => {
    seen = entries[entries.length - 1].isIntersecting;
    run();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", run);
  still.addEventListener("change", run);

  return () => {
    io.disconnect();
    ro?.disconnect();
    cancelAnimationFrame(raf);
    raf = 0;
    document.removeEventListener("visibilitychange", run);
    still.removeEventListener("change", run);
  };
}
