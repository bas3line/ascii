"use client";
/*
 * <Ascii>: a piece in React, from ascii.rest, copied into your project to keep
 * and change as you like. A client component, so it works in the Next.js app
 * router as well as anywhere else React runs.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { Ascii } from "@/components/ascii/ascii";
 *   import * as donut from "@/components/ascii/pieces/donut";
 *
 *   <Ascii piece={donut} />
 *   <Ascii piece={donut} options={{ fps: 12 }} className="art" />
 *
 * Text pieces draw into a <pre> in the element's colour and font size; the
 * coloured ones draw onto a <canvas> as wide as its container.
 */
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { mount, type MountOptions } from "./mount";
import type { Piece } from "./types";

export interface AsciiProps {
  /** A piece module, import * as donut from "./pieces/donut", or a banner from banner(). */
  piece: Piece;
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
  // An inline options object is new every render; only a real change restarts the piece.
  const key = JSON.stringify(options ?? {});
  // mono swaps the canvas for a <pre>, so the piece starts again on the new element.
  useEffect(() => {
    if (!ref.current) return;
    return mount(ref.current, piece, JSON.parse(key) as MountOptions);
  }, [piece, key, mono]);

  const props = { role: "img", "aria-label": label ?? piece.meta.name, className, style };
  return !mono && piece.meta.palette ? (
    <canvas ref={ref as RefObject<HTMLCanvasElement>} {...props} />
  ) : (
    <pre ref={ref as RefObject<HTMLPreElement>} {...props} />
  );
}
