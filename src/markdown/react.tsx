"use client";
/*
 * <Markdown>: ascii.rest's markdown components in React, and a React
 * component for each one, <Headline> and the rest. A client component, so it
 * works in the Next.js app router as well as anywhere else React runs. The
 * server renders its still, the finished drawing, as text in a
 * <pre class="ascii-md">, so the page is whole before any script runs; in the
 * browser paint() builds it in when it is first scrolled to, then plays its
 * cycle while it is in view, or holds. It imports the markdown family only,
 * never the library's loader, so a page of them doesn't bundle the pieces.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { Headline, Markdown } from "ascii.rest/markdown/react";
 *
 *   <Headline font="slim">{`ascii.rest "animated ascii art for web pages"`}</Headline>
 *   <Markdown kind="headline" source="ascii.rest" align="center" width={60} />
 *
 * The fence's body goes in as a string: a template literal in braces keeps its
 * lines, where JSX text would run them into one. Its shared indent is left out.
 * The page's own props, id, tabIndex, role, data-*, aria-* and handlers, go on
 * the <pre> as className and style do; every other prop is an option. Props it
 * can't draw render nothing, and the console says why.
 */
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { Common, FenceOptions, Kind } from "./core.ts";
import { html, paint } from "./html.ts";
import { make } from "./index.ts";

/** What every component takes: its fence's body, the options every one takes, its own options, and the <pre>'s props. */
export interface FigureProps extends Common {
  /** Its fence's body, as a string: a template literal in braces, {`ascii.rest "a line"`}. */
  children?: string;
  /** Or its body as a prop, which children give way to. */
  source?: string;
  /** Options as one object, under the props given one at a time. */
  options?: FenceOptions;
  /** What it shows, for screen readers: its own sentence by default. */
  label?: string;
  /** Plays even when the reader prefers reduced motion: only behind a control the reader chooses. false. */
  motion?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Its own options, a prop each, as a fence gives them: font="slim", align="center". */
  [option: string]: unknown;
}

/** <Markdown>'s props: a component's, and which one it is. */
export interface MarkdownProps extends FigureProps {
  /** The component: "headline" and the rest. */
  kind: Kind;
}

// The props that are <Markdown>'s own, not options.
const OWN = new Set(["kind", "children", "source", "options", "label", "motion", "className", "style", "ref"]);
// The page's own props, which go on the <pre> as they would on any element: never options. (title is the frame's.)
const isPage = (name: string) => /^(id|tabIndex|role|lang|dir|hidden|slot|data-.+|aria-.+|on[A-Z].*)$/.test(name);

/**
 * Any markdown component, by its name: <Markdown kind="headline" font="slim">{source}</Markdown>. Every prop but its
 * own and the page's is an option, as a fence's are; it is made again only when one of them really changes.
 */
export function Markdown(props: MarkdownProps) {
  const { kind, children, source, options, label, motion = false, className, style } = props;
  const ref = useRef<HTMLPreElement>(null);
  const given: Record<string, unknown> = { ...options };
  const page: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (OWN.has(name) || value === undefined) continue;
    if (isPage(name)) page[name] = value;
    else given[name] = value;
  }
  // An inline object is new every render; only a real change makes a new piece.
  const key = JSON.stringify([kind, source ?? children ?? null, given]);
  const piece = useMemo(() => {
    const [k, s, o] = JSON.parse(key) as [string, string | null, Common & FenceOptions];
    try {
      if (typeof s !== "string") throw new Error(`ascii.rest: <Markdown kind="${k}"> takes its fence's body as children, a string in braces, or as source`);
      return make(k, s, o);
    } catch (error) {
      console.warn(`<Markdown kind="${k}"> could not draw:`, error);
      return null;
    }
  }, [key]);
  // The same object while the piece is the same, so React never puts the still back over one as it builds.
  const inner = useMemo(() => (piece ? { __html: html(piece) } : null), [piece]);
  useEffect(() => {
    if (!piece || !ref.current) return;
    return paint(ref.current, piece, { motion });
  }, [piece, motion]);
  if (!piece || !inner) return null;
  return (
    <pre
      {...page}
      ref={ref}
      className={className ? `ascii-md ${className}` : "ascii-md"}
      role={typeof page.role === "string" ? page.role : "img"}
      aria-label={label ?? (typeof page["aria-label"] === "string" ? page["aria-label"] : piece.says)}
      data-md={piece.kind}
      style={{ "--cols": piece.meta.cols, "--rows": piece.meta.rows, ...style } as CSSProperties}
      dangerouslySetInnerHTML={inner}
    />
  );
}

// A React component for one kind: <Headline> is <Markdown kind="headline">.
function named(kind: Kind, name: string) {
  const Named = (props: FigureProps) => <Markdown {...props} kind={kind} />;
  Named.displayName = name;
  return Named;
}

// lettering
export const Headline = named("headline", "Headline");
export const Typing = named("typing", "Typing");
export const Flap = named("flap", "Flap");
export const Marquee = named("marquee", "Marquee");

// ornaments
export const Divider = named("divider", "Divider");
export const Confetti = named("confetti", "Confetti");
export const Solid = named("solid", "Solid");
export const Say = named("say", "Say");
export const Orbit = named("orbit", "Orbit");

// machines
export const Sequence = named("sequence", "Sequence");
export const Git = named("git", "Git");
export const Railroad = named("railroad", "Railroad");
export const Logic = named("logic", "Logic");

// inside a system
export const Flame = named("flame", "Flame");
export const Bits = named("bits", "Bits");
export const Pinout = named("pinout", "Pinout");
export const Schema = named("schema", "Schema");

// tokens
export const Qr = named("qr", "Qr");
export const Sigil = named("sigil", "Sigil");
export const Stamp = named("stamp", "Stamp");
export const Ticket = named("ticket", "Ticket");

// games
export const Chess = named("chess", "Chess");
export const Bracket = named("bracket", "Bracket");
export const Sprite = named("sprite", "Sprite");

// places
export const World = named("world", "World");

export type { Common, FenceOptions, Kind };
