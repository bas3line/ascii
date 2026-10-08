/*
 * A piece's downloads, made in the browser: a PNG of one frame, a video and a
 * GIF. Each plays the piece with mount, as the page does, on a canvas no one
 * sees, in the page's theme and, for a logo, in colour or in one ink. A scene
 * fills the picture edge to edge, 1280 px wide; anything else sits on the
 * page's well with a margin round it. The PNG is twice the size.
 */
import { mount, type Env, type Meta, type Piece } from "ascii.rest";

export interface Look {
  /** A logo in one ink, the page's, rather than in colour. */
  mono: boolean;
  /** The page's colours: its ink, and the well a piece sits on. */
  ink: string;
  well: string;
}

/** The picture's size at `scale`, and the box the art fills in it. */
function layout(meta: Meta, scale: number) {
  const { cols, rows, cell = 2 } = meta;
  const even = (n: number) => 2 * Math.ceil(n / 2);
  let w: number, h: number, art: { x: number; y: number; w: number; h: number };
  if (meta.ground) {
    w = 1280;
    h = even((w * rows * cell) / cols);
    art = { x: 0, y: 0, w, h };
  } else {
    // cells up to 16 px wide, the art up to 1040 by 720, and 48 px of well round it
    const size = Math.min(16, 1040 / cols, 720 / (rows * cell));
    const aw = Math.round(cols * size), ah = Math.round(rows * cell * size);
    w = even(aw + 96);
    h = even(ah + 96);
    art = { x: Math.floor((w - aw) / 2), y: Math.floor((h - ah) / 2), w: aw, h: ah };
  }
  return { w: w * scale, h: h * scale, art: { x: art.x * scale, y: art.y * scale, w: art.w * scale, h: art.h * scale } };
}

/**
 * mount plays the piece on a canvas `width` pixels wide. It plays only what is
 * on screen, so the canvas sits in the viewport, invisible, in a box a pixel
 * square that keeps it from widening a phone's page. The play time is ours:
 * `at(t)` resolves with the canvas once mount has drawn the frame at `t`. It
 * draws on every animation frame, and under reduced motion too.
 */
function stage(piece: Piece, look: Look, width: number) {
  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `width:${width / devicePixelRatio}px;color:${look.ink}`;
  box.append(canvas);
  document.body.append(box);
  let now = 0, drawn = NaN, text = "";
  // A logo in one ink is drawn without its palette: text in the canvas's colour, as a <pre> shows it.
  const meta = look.mono && !piece.meta.ground ? { ...piece.meta, palette: undefined } : piece.meta;
  const timed: Piece = {
    meta,
    default: (options) => {
      const frame = piece.default(options);
      // A frame is worked out once however often mount draws it; env.color still holds its colours.
      return (_t: number, env?: Env) => {
        if (drawn !== now) (drawn = now), (text = frame(now, env));
        return text;
      };
    },
  };
  const stop = mount(canvas, timed, { fps: 1000, motion: true });
  return {
    at: (t: number) =>
      new Promise<HTMLCanvasElement>((resolve) => {
        now = t;
        const wait = () => (drawn === t ? resolve(canvas) : requestAnimationFrame(wait));
        requestAnimationFrame(wait);
      }),
    end: () => {
      stop();
      box.remove();
    },
  };
}

/** The canvas a download is drawn on, and `paint`, which puts a frame from the stage on it. */
function picture(meta: Meta, look: Look, scale: number, read = false) {
  const { w, h, art } = layout(meta, scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: read })!;
  ctx.imageSmoothingQuality = "high";
  const paint = (from: HTMLCanvasElement) => {
    ctx.fillStyle = meta.ground ?? look.well;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(from, art.x, art.y, art.w, art.h);
  };
  return { canvas, ctx, w, h, art, paint };
}

/** The frame at `t`, as a PNG at twice the size. */
export async function png(piece: Piece, look: Look, t: number): Promise<Blob> {
  const pic = picture(piece.meta, look, 2);
  const s = stage(piece, look, pic.art.w);
  try {
    pic.paint(await s.at(t));
  } finally {
    s.end();
  }
  return new Promise((resolve, reject) => pic.canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("download: no png"))), "image/png"));
}

/** What MediaRecorder may record, best first: MP4 where the browser makes it (Safari, recent Chrome), WebM where not. */
const TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];

/** The type of video this browser records from a canvas, if it records one. */
export const videoType = () =>
  typeof MediaRecorder === "function" && "captureStream" in HTMLCanvasElement.prototype
    ? TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    : undefined;

/**
 * `seconds` of play from `from`, recorded as it plays: the canvas's stream
 * through MediaRecorder, which takes real time. `left` hears the whole seconds
 * to go. Play stops while the tab is hidden, and the recording with it.
 */
export async function video(piece: Piece, look: Look, from: number, seconds: number, left: (s: number) => void): Promise<Blob> {
  const type = videoType();
  if (!type) throw new Error("download: this browser cannot record a canvas");
  const fps = Math.min(30, piece.meta.fps || 30);
  const pic = picture(piece.meta, look, 1);
  const s = stage(piece, look, pic.art.w);
  let rec: MediaRecorder | undefined;
  const hide = () => {
    if (document.hidden && rec?.state === "recording") rec.pause();
    else if (!document.hidden && rec?.state === "paused") rec.resume();
  };
  try {
    pic.paint(await s.at(from));
    // text needs more than the default rate to stay sharp
    const bits = Math.round(Math.min(12e6, Math.max(4e6, pic.w * pic.h * fps * 0.25)));
    rec = new MediaRecorder(pic.canvas.captureStream(fps), { mimeType: type, videoBitsPerSecond: bits });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((resolve, reject) => {
      rec!.onstop = () => resolve();
      rec!.onerror = () => reject(new Error("download: the recording failed"));
    });
    done.catch(() => {});
    document.addEventListener("visibilitychange", hide);
    // Play time follows the clock, a tenth of a second at most a frame, as mount's does.
    let played = 0, last = performance.now();
    const until = (ms: number) =>
      new Promise<void>((resolve) => {
        const tick = (now: number) => {
          played += Math.min(Math.max(now - last, 0), 100);
          last = now;
          if (played >= ms) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    rec.start();
    last = performance.now();
    const n = Math.round(seconds * fps);
    for (let k = 1; k <= n; k++) {
      left(Math.max(1, Math.ceil(seconds - played / 1000)));
      await until((k * 1000) / fps);
      if (k < n) pic.paint(await s.at(from + k / fps));
    }
    rec.stop();
    await done;
    return new Blob(chunks, { type: rec.mimeType || type });
  } finally {
    document.removeEventListener("visibilitychange", hide);
    if (rec && rec.state !== "inactive") rec.stop();
    s.end();
  }
}

/** A CSS colour as [r, g, b]. */
function rgb(css: string) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = css;
  const hex = String(ctx.fillStyle);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/**
 * `seconds` from `from` as a GIF at up to 15 fps, drawn frame by frame, so it
 * takes as long as the drawing and encoding do; `done` hears how much is. All
 * frames share one palette, from frames across the clip, and each stores only
 * the pixels that changed, the rest transparent over the frame before it. A
 * frame that changes nothing only holds the one before it longer.
 */
export async function gif(piece: Piece, look: Look, from: number, seconds: number, done: (part: number) => void): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette, snapColorsToPalette } = await import("gifenc");
  const { meta } = piece;
  const fps = Math.min(15, meta.fps || 15);
  const n = Math.round(seconds * fps);
  const pic = picture(meta, look, 1, true);
  const s = stage(piece, look, pic.art.w);
  const { w, h } = pic;
  const grab = async (t: number) => {
    pic.paint(await s.at(t));
    return pic.ctx.getImageData(0, 0, w, h).data;
  };
  try {
    // the palette, from every fourth pixel of a few frames
    const SAMPLES = 6;
    const px = w * h, per = Math.ceil(px / 4);
    const sample = new Uint32Array(SAMPLES * per);
    for (let i = 0; i < SAMPLES; i++) {
      const data = new Uint32Array((await grab(from + (i * seconds) / SAMPLES)).buffer);
      for (let p = 0, o = i * per; p < px; p += 4) sample[o++] = data[p];
      done((i + 1) / (SAMPLES + n));
    }
    const colours: number[][] = quantize(new Uint8Array(sample.buffer), 255);
    // the ground and the inks exactly, not their neighbours' average
    const inks = meta.palette && !(look.mono && !meta.ground) ? [...meta.palette] : [look.ink];
    snapColorsToPalette(colours, [meta.ground ?? look.well, ...inks].map(rgb), 12);
    // one more slot, never drawn: the transparent one
    const clear = colours.length;
    const enc = GIFEncoder();
    type Held = { index: Uint8Array; delay: number; first: boolean };
    const write = (f: Held) =>
      enc.writeFrame(f.index, w, h, f.first ? { palette: [...colours, [0, 0, 0]], delay: f.delay, dispose: 1 } : { delay: f.delay, transparent: true, transparentIndex: clear, dispose: 1 });
    let prev: Uint8Array | undefined, held: Held | undefined;
    for (let k = 0; k < n; k++) {
      const index: Uint8Array = applyPalette(await grab(from + k / fps), colours);
      // in hundredths of a second, rounded so the delays add up to the clip
      const delay = (Math.round(((k + 1) * 100) / fps) - Math.round((k * 100) / fps)) * 10;
      done((SAMPLES + k + 1) / (SAMPLES + n));
      if (!prev || !held) {
        held = { index, delay, first: true };
        prev = index;
        continue;
      }
      const diff = new Uint8Array(index.length);
      let changed = false;
      for (let i = 0; i < index.length; i++) {
        if (index[i] === prev[i]) diff[i] = clear;
        else (diff[i] = index[i]), (changed = true);
      }
      if (!changed) {
        held.delay += delay;
        continue;
      }
      write(held);
      held = { index: diff, delay, first: false };
      prev = index;
    }
    if (held) write(held);
    enc.finish();
    return new Blob([enc.bytesView()], { type: "image/gif" });
  } finally {
    s.end();
  }
}
