/*
 * studio scenes: the parametrized scene registry.
 * Every scene is its own module; this index collects them so the studio can
 * list and load them, and the picker can route a slug to its spec.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

import { alpineDawn } from "./alpine-dawn.ts";
import { amerFort } from "./amer-fort.ts";
import { auroraFjord } from "./aurora-fjord.ts";
import { blackPrism } from "./black-prism.ts";
import { cloudSea } from "./cloud-sea.ts";
import { commandCity } from "./command-city.ts";
import { deepReef } from "./deep-reef.ts";
import { desertNight } from "./desert-night.ts";
import { earthrise } from "./earthrise.ts";
import { edgeOrbit } from "./edge-orbit.ts";
import { gangaurGhat } from "./gangaur-ghat.ts";
import { greenStorm } from "./green-storm.ts";
import { jalMahal } from "./jal-mahal.ts";
import { jungleFalls } from "./jungle-falls.ts";
import { kiteFestival } from "./kite-festival.ts";
import { kyotoDusk } from "./kyoto-dusk.ts";
import { lakePichola } from "./lake-pichola.ts";
import { lanternLake } from "./lantern-lake.ts";
import { lavaWall } from "./lava-wall.ts";
import { marineDrive } from "./marine-drive.ts";
import { mistyForest } from "./misty-forest.ts";
import { nightCoast } from "./night-coast.ts";
import { nightHighway } from "./night-highway.ts";
import { oceanSunset } from "./ocean-sunset.ts";
import { planetScale } from "./planet-scale.ts";
import { prismCity } from "./prism-city.ts";
import { saltFlat } from "./salt-flat.ts";
import { saturnRise } from "./saturn-rise.ts";
import { snowTrain } from "./snow-train.ts";
import { stormPlains } from "./storm-plains.ts";
import { tajDawn } from "./taj-dawn.ts";
import { tokyoRain } from "./tokyo-rain.ts";
import { varanasiGhats } from "./varanasi-ghats.ts";
import { volcanoNight } from "./volcano-night.ts";

/** Stable slug from a scene's display name. */
export const sceneSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Every parametrized scene, in the order the library lists them. */
export const ALL_SCENES: SceneSpec[] = [
  alpineDawn,
  amerFort,
  auroraFjord,
  blackPrism,
  cloudSea,
  commandCity,
  deepReef,
  desertNight,
  earthrise,
  edgeOrbit,
  gangaurGhat,
  greenStorm,
  jalMahal,
  jungleFalls,
  kiteFestival,
  kyotoDusk,
  lakePichola,
  lanternLake,
  lavaWall,
  marineDrive,
  mistyForest,
  nightCoast,
  nightHighway,
  oceanSunset,
  planetScale,
  prismCity,
  saltFlat,
  saturnRise,
  snowTrain,
  stormPlains,
  tajDawn,
  tokyoRain,
  varanasiGhats,
  volcanoNight,
];

/** Scene by slug, for the studio picker. */
export const sceneBySlug: Map<string, SceneSpec> = new Map(
  ALL_SCENES.map((s) => [sceneSlug(s.name), s]),
);