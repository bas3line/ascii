"use client";
/*
 * <Ascii>: a piece in React. A client component, so it works in the Next.js
 * app router as well as anywhere else React runs.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { Ascii } from "ascii.rest/react";
 *   import { donut } from "ascii.rest/pieces";
 *
 *   <Ascii piece={donut} />                      // bundled with your page
 *   <Ascii piece="night-coast" />                // or fetched by name when it mounts
 *   <Ascii piece={donut} options={{ fps: 12 }} className="art" />
 *   <Ascii piece="rust" mono />                  // a coloured piece in one ink
 *   <Banner text="hello" color="#f97316" />      // any text, in block letters
 *
 * Text pieces draw into a <pre> in the element's colour and font size; the
 * coloured ones draw onto a <canvas> as wide as its container.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { banner, type BannerOptions } from "./banner.ts";
import { canvas, isPiece, load, type PieceName } from "./library.ts";
import { mount, type MountOptions } from "./mount.ts";
import type { Piece } from "./types.ts";

export interface AsciiProps {
  /** A piece module, from "ascii.rest/pieces", or a piece's file name to load on demand. */
  piece: Piece | PieceName;
  /** The piece's option overrides, and `fps` to override its frame rate. */
  options?: MountOptions;
  /** What the picture shows, for screen readers. The piece's name otherwise. */
  label?: string;
  /** Draws a coloured piece as text in one ink, in a <pre> like any other. */
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Ascii({ piece, options, label, mono = false, className, style }: AsciiProps) {
  const ref = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<Piece | null>(null);
  const mod = typeof piece === "string" ? loaded : piece;

  useEffect(() => {
    if (typeof piece !== "string" || !isPiece(piece)) return;
    let live = true;
    setLoaded(null);
    load[piece]().then((m) => live && setLoaded(m));
    return () => {
      live = false;
    };
  }, [piece]);

  // An inline options object is new every render; only a real change restarts the piece.
  const key = JSON.stringify(options ?? {});
  // mono swaps the canvas for a <pre>, so the piece starts again on the new element.
  useEffect(() => {
    if (!mod || !ref.current) return;
    return mount(ref.current, mod, JSON.parse(key) as MountOptions);
  }, [mod, key, mono]);

  // Known before loading, so a coloured piece gets its canvas from the first render.
  const onCanvas = !mono && (typeof piece === "string" ? canvas.has(piece) : Boolean(piece.meta.palette));
  const name = typeof piece === "string" ? piece : piece.meta.name;
  const props = { role: "img", "aria-label": label ?? mod?.meta.name ?? name, className, style };
  return onCanvas ? (
    <canvas ref={ref as RefObject<HTMLCanvasElement>} {...props} />
  ) : (
    <pre ref={ref as RefObject<HTMLPreElement>} {...props} />
  );
}

export interface BannerProps extends BannerOptions {
  /** The text, in block letters. */
  text: string;
  /** What the picture shows, for screen readers. The text otherwise. */
  label?: string;
  /** Draws a coloured banner as text in one ink, in a <pre>. */
  mono?: boolean;
  /** Overrides its frame rate. */
  fps?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * <Banner>: any text as a banner, every option of banner() a prop. With no colour it is text in the element's own
 * colour; with one, a fade or one for each theme, it is drawn on a canvas. Props banner() can't take render nothing,
 * and the console says why.
 *
 *   <Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" effect="type" />
 */
export function Banner({ text, label, mono, fps, className, style, ...options }: BannerProps) {
  // An inline options object is new every render; only a real change makes a new banner.
  const key = JSON.stringify([text, options]);
  const piece = useMemo(() => {
    const [t, o] = JSON.parse(key) as [string, BannerOptions];
    try {
      return banner(t, o);
    } catch (error) {
      console.warn("<Banner> could not draw:", error);
      return null;
    }
  }, [key]);
  if (!piece) return null;
  return <Ascii piece={piece} options={fps ? { fps } : undefined} label={label ?? piece.meta.name} mono={mono} className={className} style={style} />;
}

export type { BannerOptions, MountOptions, Piece, PieceName };
