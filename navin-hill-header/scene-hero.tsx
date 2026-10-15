"use client";

/*
 * A category header drawn by an ascii.rest scene instead of a gallery image,
 * with one icon in the top right corner to stop and start it.
 *
 * The scene plays by default, whatever the reader's reduced-motion setting says.
 * That is the one place ascii.rest asks you to be deliberate — it holds a
 * reduced-motion reader's piece still unless told otherwise — so the override
 * comes with the reader's own control, in the header: on hover (always visible
 * on a touch screen, and reachable with Tab).
 *
 * The markup is deliberately the subject-hero the image headers already use, so
 * subject.css keeps styling the overlay, title and meta list: the scene only
 * takes the photograph's place.
 */
import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Ascii, type AsciiProps } from "ascii.rest/react";
import "./scene-hero.css";

/** Playing: the piece's own frame rate, whatever the reader's motion setting is. */
const PLAYING: AsciiProps["options"] = { motion: true };
/** Stopped: one frame at t=0 and no loop. New options re-mount the piece. */
const STOPPED: AsciiProps["options"] = { motion: true, fps: 0 };

export interface SceneHeroProps {
  /** Any ascii.rest piece, by name: a string, so a server page may render this. */
  piece: AsciiProps["piece"];
  title: string;
  /** The list under the title: "Project Overview", "Highlights", … */
  meta: string[];
  /** Whether it starts playing; the header's toggle turns it off and on. */
  defaultMotion?: boolean;
}

export function SceneHero({ piece, title, meta, defaultMotion = true }: SceneHeroProps) {
  const [playing, setPlaying] = useState(defaultMotion);

  return (
    <div className="subject-hero subject-hero-scene">
      <Ascii piece={piece} options={playing ? PLAYING : STOPPED} className="subject-hero-art" />
      <div className="subject-hero-overlay">
        <h1 className="subject-hero-title">{title}</h1>
        <ul className="subject-hero-meta">
          {meta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="scene-hero-toggle"
        aria-label={playing ? "Stop the header animation" : "Play the header animation"}
        title={playing ? "Stop the animation" : "Play the animation"}
        onClick={() => setPlaying((on) => !on)}
      >
        {playing ? <Pause aria-hidden size={15} /> : <Play aria-hidden size={15} />}
      </button>
    </div>
  );
}
