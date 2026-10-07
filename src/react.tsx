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
 *
 * Text pieces draw into a <pre> in the element's colour and font size; the
 * coloured scenes draw onto a <canvas> as wide as its container.
 */
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
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
  className?: string;
  style?: CSSProperties;
}

export function Ascii({ piece, options, label, className, style }: AsciiProps) {
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
  useEffect(() => {
    if (!mod || !ref.current) return;
    return mount(ref.current, mod, JSON.parse(key) as MountOptions);
  }, [mod, key]);

  // Known before loading, so a scene gets its canvas from the first render.
  const onCanvas = typeof piece === "string" ? canvas.has(piece) : Boolean(piece.meta.palette);
  const name = typeof piece === "string" ? piece : piece.meta.name;
  const props = { role: "img", "aria-label": label ?? mod?.meta.name ?? name, className, style };
  return onCanvas ? (
    <canvas ref={ref as RefObject<HTMLCanvasElement>} {...props} />
  ) : (
    <pre ref={ref as RefObject<HTMLPreElement>} {...props} />
  );
}

export type { MountOptions, Piece, PieceName };
