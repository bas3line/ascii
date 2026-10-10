---
layout: ../../layouts/Docs.astro
title: places
description: A markdown component of the world, the earth piece's map with pins by airport code, great circle routes and a key, where your servers or your users are.
---

A component of where things are. Its land is the map ascii.rest's earth piece is drawn from. How fences work, and every place they play, is on [markdown components](/docs/markdown/).

## world

A map of the world with pins on it, the routes between them and a key under it: where the servers are, where the users are, where you are.

```ascii world title=regions here=sfo
sfo "us west"
iad "us east"
fra "eu central"
sin "asia"
```

The land resolves out of static from the west, then the pins drop in, a ring closing on each, and the key types beside them. Then, while it is in view, the `here` pin beacons, and a dot flies each route every 2 seconds. Its still is the finished map.

````md
```ascii world title=regions here=sfo
sfo "us west"
iad "us east"
fra "eu central"
sin "asia"
```
````

Its plain text:

```text
╭─ regions ────────────────────────────────────╮
│         ▄▄▄▄▄▄▄▄▄▄▄▖    ▖         ▄          │
│ ▘ ████████▌ ▀█ ▝█▀▘▗  ▗▄▛██████████████████▛ │
│       ▜██████▛▀▘     █▞2█▛▀█▜█████████▀▖     │
│       ▝●██▛▜1       ▄█▄▄▄███████████▌▝       │
│          ▀▘▄        ████████▀▘▝█▀▀█▛▗▖       │
│             ████▄      ████▘     ▝3▐▙▖▄      │
│              ▜███▘      ██▛▗        ▄▄▙▄▖    │
│              ▟▛▀        ▀▀▘         ▀▀▀█▛    │
│              ▛                               │
│               ▖             ▗▄▄▄▄▄▄▄▄▄▄▖     │
│ ▄██████████████████████████████████████████▄ │
│                                              │
│ ● sfo  us west                               │
│ 1 iad  us east                               │
│ 2 fra  eu central                            │
│ 3 sin  asia                                  │
╰──────────────────────────────────────────────╯
```

A line is a place: an airport's three letter code, `sfo`, or a latitude and longitude in degrees, `52.52 13.40` or `33.9s 151.2e`, then its label in quotes. A `route` line joins two places by their codes or labels, `route lhr jfk`, and follows the great circle a flight takes, dotted over the sea so the land stays readable. Up to 24 places, numbered in the key in the order written. The land is drawn in quadrant blocks, 44 by 11 inside its frame, and a `width` scales it.

| option | what it does | default |
| --- | --- | --- |
| `here` | The place you are at, by its code or its label: drawn `●` on the map and in the key, beaconing, the other pins numbered from 1. | none |

Two routes from London, 60 columns wide:

```ascii world width=60
lhr "london"
jfk "new york"
nrt "tokyo"
route lhr jfk
route lhr nrt
```

```text
╭──────────────────────────────────────────────────────────╮
│                 ▄▄  ▄▄▄▄▄                                │
│ ▄ ▗▄▄▄▄▄▟████▀▀▜█▙ ▐███▛▀     ▗▄▄▄▄▄▄▄▄████████▙▄▄▄▄▄▄▄▄ │
│   ▝▀▀▀▀▜█████▙▄▄██▄ ▝▘···▘▗1·██▟██████████████████▀▀▀▀▀  │
│         ▐███████2▀▘··     ▗█▛▜██▛▀██▜███████████▀▀▖      │
│          ▀███▛▜▛          ▟█▙▄▄▄██████████████▌▝ 3       │
│            ▝▜▄▄          ▐██████████▛▘ ▜█▀▀██▀▗▖         │
│                ▐███▄      ▀▀▀▜█████▀       ▟▌▄▞▘         │
│                ▝██████▖      ▝████         ▝▚▛▀▘▝█▄      │
│                  █████       ▝▜██▛ ▙          ▄▟██▙▖     │
│                 ▗██▀          ▝▀▀▘            ▀▀▀▜█▛     │
│                 ▐█                                    ▝  │
│                 ▝                                        │
│                ▗▄▄▙     ▗▄▄▄▄▄▄▄▄▄▄▄▟█████████████▙▄▄▄▖  │
│ ████████████████████████████████████████████████████████ │
│                                                          │
│ 1 lhr  london                                            │
│ 2 jfk  new york                                          │
│ 3 nrt  tokyo                                             │
╰──────────────────────────────────────────────────────────╯
```

The codes it knows are the busy airports of every continent, from OurAirports' data, and `AIRPORTS` from `ascii.rest/markdown` lists them with their latitude and longitude. A place it doesn't know is written as a latitude and longitude.

```ts
// offices.ts
import { world } from "ascii.rest/markdown";

export default world({
  places: [
    { code: "sfo", label: "us west" },
    { lat: 52.52, lon: 13.4, label: "berlin" },
  ],
  routes: [["sfo", "berlin"]],
});
```

In React it is `<World>`.
