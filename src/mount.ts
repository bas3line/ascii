/*
 * mount: plays an ascii piece in a <pre>, or on a <canvas> in colour.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 * In a <pre> every piece is text in the pre's own colour. On a <canvas> it is
 * drawn in its palette (or the canvas's text colour, without one) over
 * `meta.ground`, filling the canvas's width with cells `meta.cell` widths
 * tall: 2 by default, the shape of a character, or 1 for a square grid.
 *
 * Play time only advances while the element is on screen and the tab is open,
 * and prefers-reduced-motion keeps the first frame. Returns a stop function.
 *
 *   import { mount } from "ascii.rest";
 *   import { donut } from "ascii.rest/pieces";
 *   const stop = mount(document.querySelector("pre")!, donut);
 */
import type { Env, Frame, Meta, Options, Piece } from "./types.ts";

/** The piece's option overrides, and `fps` to override its frame rate. */
export type MountOptions = Options & { fps?: number };

export function mount(el: HTMLElement, piece: Piece | Piece["default"], options: MountOptions = {}): () => void {
  const make = typeof piece === "function" ? piece : piece.default;
  const meta: Partial<Meta> = typeof piece === "function" ? {} : piece.meta;
  const { fps = meta.fps ?? 30, ...rest }: MountOptions = { ...meta.options, ...options };
  const frame: Frame = make(rest);
  const { cols = 80, rows = 24, palette, ground, cell = 2 } = meta;
  const color = palette ? new Uint8Array(cols * rows) : undefined;

  const rgb = (css: string) => (css[0] === "#" ? [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16)) : (css.match(/[\d.]+/g) || []).map(Number));
  const dark = (css: string) => {
    const c = rgb(css);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] < 128;
  };
  const canvas = el instanceof HTMLCanvasElement ? el : null;
  const env = (): Env => ({ paper: canvas && ground ? !dark(ground) : dark(getComputedStyle(el).color), color });
  let t = 0;
  let draw = () => {
    el.textContent = frame(t, env());
  };

  // On a canvas each (character, colour) pair is drawn once into an atlas and
  // copied from there, so a frame is one drawImage a cell.
  let ro: ResizeObserver | undefined;
  if (canvas) {
    const font = (px: number) => `${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const ctx = canvas.getContext("2d")!;
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d")!;
    const slots = new Map<number, number>();
    let w = 0, h = 0, sw = 0, sh = 0, width = -1, ink = "";
    canvas.style.display ||= "block";
    canvas.style.width ||= "100%";
    canvas.style.aspectRatio = `${cols} / ${rows * cell}`;
    const size = () => {
      width = canvas.clientWidth;
      w = (width * (devicePixelRatio || 1)) / cols;
      h = w * cell;
      sw = Math.ceil(w);
      sh = Math.ceil(h);
      canvas.width = Math.round(w * cols);
      canvas.height = Math.round(h * rows);
      atlas.width = sw * 32;
      atlas.height = sh * 32;
      slots.clear();
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
      const x = (s % 32) * sw, y = Math.floor(s / 32) * sh;
      actx.font = font(w / 0.6);
      actx.textAlign = "center";
      actx.textBaseline = "middle";
      actx.fillStyle = palette ? palette[i] || palette[0] : ink;
      actx.fillText(String.fromCharCode(code), x + sw / 2, y + sh / 2);
      slots.set(key, s);
      return s;
    };
    draw = () => {
      if (!palette && getComputedStyle(canvas).color !== ink) {
        ink = getComputedStyle(canvas).color;
        slots.clear();
        actx.clearRect(0, 0, atlas.width, atlas.height);
      }
      const text = frame(t, env());
      if (ground) {
        ctx.fillStyle = ground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let k = 0, x = 0, y = 0; k < text.length; k++) {
        const c = text.charCodeAt(k);
        if (c === 10) {
          x = 0;
          y++;
          continue;
        }
        if (c !== 32) {
          const s = glyph(c, color ? color[y * cols + x] : 0);
          const dx = Math.round(x * w + (w - sw) / 2), dy = Math.round(y * h + (h - sh) / 2);
          ctx.drawImage(atlas, (s % 32) * sw, Math.floor(s / 32) * sh, sw, sh, dx, dy, sw, sh);
        }
        x++;
      }
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
    const go = seen && !document.hidden && !still.matches;
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
