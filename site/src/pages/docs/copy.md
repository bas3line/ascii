---
layout: ../../layouts/Docs.astro
title: your own copy
description: Every piece and every part of the library is a shadcn registry item, so its TypeScript goes into your project to keep and change.
---

Install it from npm and you get updates; copy it in and the code is yours. Every piece, the banner, the SVG writer and the React components are also a [shadcn](https://ui.shadcn.com) registry, so they can be added to your project as source.

## With shadcn

In a project with a `components.json`:

```sh
npx shadcn@latest add https://ascii.rest/r/ascii.json https://ascii.rest/r/donut.json
```

Or name the registry once in `components.json`, and add items by name:

```json
{
  "registries": {
    "@ascii": "https://ascii.rest/r/{name}.json"
  }
}
```

```sh
npx shadcn@latest add @ascii/ascii-banner @ascii/night-coast
```

## Without shadcn

```sh
npx ascii.rest add ascii donut
```

It reads the same registry and writes the same files, into `components/ascii`, or `src/components/ascii` when there is a `src` folder. `--dir` puts them elsewhere, and files already there are kept unless you pass `--overwrite`.

## The items

| item | what it adds |
| --- | --- |
| `core` | `types.ts`, the piece contract, and `mount.ts`: every other item needs it |
| `ascii` | `ascii.tsx`: `<Ascii>` for React and Next.js |
| `banner` | `banner.ts`: `banner()`, any text in block letters |
| `ascii-banner` | `ascii-banner.tsx`: `<Banner>` for React and Next.js |
| `svg` | `svg.ts`: `svg()` and `bannerSvg()` |
| `<piece>` | `pieces/<piece>.ts`, for any of the 216 pieces: `donut`, `night-coast`, `rust` |
| `all` | everything |

An item brings the items it needs with it. The index of every item is at [/r/registry.json](/r/registry.json).

## Where the files go

Every file lands in your components folder, under `ascii/`, laid out as the library lays itself out, so their imports of each other hold:

```
components/ascii/
  types.ts
  mount.ts
  ascii.tsx
  banner.ts
  ascii-banner.tsx
  svg.ts
  pieces/
    donut.ts
    night-coast.ts
```

## Using them

A copied piece is a module like any other; `<Ascii>` takes it whole:

```tsx
import { Ascii } from "@/components/ascii/ascii";
import { Banner } from "@/components/ascii/ascii-banner";
import * as donut from "@/components/ascii/pieces/donut";

export default function Page() {
  return (
    <>
      <Ascii piece={donut} />
      <Banner text="mine now" shadow="rounded" />
    </>
  );
}
```

The copied `<Ascii>` takes modules, not names: a name needs the library's index of every piece, which a copy leaves out. Everything else, props, options and behaviour, is as [react](/docs/react/) describes, and `mount()` from `mount.ts` works as [typescript](/docs/typescript/) does.

Change anything. A piece is one function of time: its characters, its colours in `meta.palette`, its speed. [your own pieces](/docs/pieces/) has the contract it keeps.

## Updating

There is no lockfile: your copy is yours. To take a newer one, add the item again with `--overwrite`, or with shadcn's `--overwrite`, and look at the diff.
