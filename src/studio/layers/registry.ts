/*
 * studio layers registry: centralized layer type definitions and factory mappings.
 * Part of ascii.rest, MIT licensed.
 */
import type { LayerDefinition, LayerInstance } from "../types.ts";
import { heightfieldDefinition } from "./heightfield.ts";
import { imageDefinition } from "./image.ts";
import { particlesDefinition } from "./particles.ts";
import { skyDefinition } from "./sky.ts";
import { waterDefinition } from "./water.ts";

const LAYER_REGISTRY = new Map<string, LayerDefinition>([
  [skyDefinition.type, skyDefinition],
  [heightfieldDefinition.type, heightfieldDefinition],
  [waterDefinition.type, waterDefinition],
  [particlesDefinition.type, particlesDefinition],
  [imageDefinition.type, imageDefinition],
]);

/** Returns the layer definition for a registered layer type. */
export function getLayerDefinition(type: string): LayerDefinition | undefined {
  return LAYER_REGISTRY.get(type);
}

/** Lists all available layer definitions. */
export function listLayerDefinitions(): LayerDefinition[] {
  return Array.from(LAYER_REGISTRY.values());
}

/** Registers a custom layer definition into the studio engine. */
export function registerLayer(def: LayerDefinition): void {
  LAYER_REGISTRY.set(def.type, def);
}

/** Instantiates a fresh layer runner for a given type. */
export function createLayerInstance(type: string): LayerInstance {
  const def = LAYER_REGISTRY.get(type);
  if (!def) {
    throw new Error(`ascii.rest studio: unknown layer type "${type}"`);
  }
  return def.create();
}
