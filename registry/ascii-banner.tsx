"use client";
/*
 * <Banner>: any text in block letters, from ascii.rest, copied into your
 * project to keep and change as you like. Every option of banner() is a prop:
 * the font, the shadow, the letters' character, how it moves, its colours.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { Banner } from "@/components/ascii/ascii-banner";
 *
 *   <Banner text="hello" color={["#f97316", "#f778ba"]} shadow="rounded" effect="type" />
 */
import { useMemo, type CSSProperties } from "react";
import { Ascii } from "./ascii";
import { banner, type BannerOptions } from "./banner";

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

export function Banner({ text, label, mono, fps, className, style, ...options }: BannerProps) {
  // An inline options object is new every render; only a real change makes a new banner.
  const key = JSON.stringify([text, options]);
  const piece = useMemo(() => {
    const [t, o] = JSON.parse(key) as [string, BannerOptions];
    try {
      return banner(t, o);
    } catch {
      return null;
    }
  }, [key]);
  if (!piece) return null;
  return <Ascii piece={piece} options={fps ? { fps } : undefined} label={label ?? piece.meta.name} mono={mono} className={className} style={style} />;
}
