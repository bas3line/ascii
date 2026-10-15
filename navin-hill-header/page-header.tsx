"use client";

/*
 * A page header for navin_hill: one ascii.rest scene behind the page's title.
 *
 *   // app/[category]/page.tsx — a server component: pass the piece BY NAME
 *   import { PageHeader } from "@/components/page-header";
 *
 *   <PageHeader piece="night-coast" eyebrow="manipal" title="the coast road" />
 *
 * Why a name and not a piece module: this file is a "use client" island, and a
 * prop crossing from a server component has to be serializable — a piece module
 * is a function. The name is a string, and <Ascii> fetches that piece's own
 * chunk when it mounts.
 *
 * Needs `pnpm add ascii.rest`. One package, no runtime dependencies, react >= 18
 * its only peer.
 */
import type { ReactNode } from "react";
import { Ascii, type AsciiProps } from "ascii.rest/react";
import "./page-header.css";

export interface PageHeaderProps {
  /** Any scene, logo, company or distro of ascii.rest, by name. Scenes are 200x100: a 2:1 canvas. */
  piece?: AsciiProps["piece"];
  title: string;
  eyebrow?: string;
  /** "band" crops the scene to a fixed height; "natural" keeps its own 2:1 box. */
  variant?: "band" | "natural";
  /** The piece's option overrides, `fps`, and `motion` (see the notes in the README). */
  options?: AsciiProps["options"];
  /** What the picture shows, for screen readers: the piece's own name by default. */
  label?: string;
  children?: ReactNode;
}

export function PageHeader({
  piece = "night-coast",
  title,
  eyebrow,
  variant = "band",
  options,
  label,
  children,
}: PageHeaderProps) {
  return (
    <header className={`page-header page-header--${variant}`}>
      <Ascii piece={piece} options={options} label={label} className="page-header__art" />
      <div className="page-header__text">
        {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
        {children}
      </div>
    </header>
  );
}
