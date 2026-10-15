<div align="center">

# ASCII Scene Studio

**Interactive ASCII scene studio, parameter synthesizer & animation engine.**

[Live Studio](https://ascii.navinhill.com) · [GitHub](https://github.com/jamesnavinhill/ascii) · [Documentation](https://ascii.navinhill.com/docs/) · [License](LICENSE)

[![Author](https://img.shields.io/badge/author-%40jamesnavinhill-181717?logo=github&logoColor=white)](https://github.com/jamesnavinhill)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-181717?logo=typescript&logoColor=white)](src/types.ts)
[![License](https://img.shields.io/badge/license-MIT-181717)](LICENSE)

</div>

---

## Overview

ASCII Scene Studio is a high-performance creative coding engine and web studio for real-time procedural ASCII art, generative shaders, and living animations.

Launch the studio directly in your browser at **[ascii.navinhill.com](https://ascii.navinhill.com)**.

- **Real-Time Parameter Synthesizer**: Interactively tune wind speed, wave frequency, sun position, palette gradients, and geometry fidelity.
- **Instant Code Export**: Export working TypeScript modules, React components, Astro tags, or custom SVG animations on the fly.
- **240+ Curated Scenes & Shaders**: Landscapes, ocean sunsets, cyber prisms, physics simulations, 3D math projections, and UI widgets.
- **Ultra-Lightweight**: Native canvas and monospace text rendering with zero bloat and low CPU overhead.

---

## Quickstart

### Run Locally

```sh
# Clone the repository
git clone https://github.com/jamesnavinhill/ascii.git
cd ascii

# Install dependencies
npm ci
npm --prefix site ci

# Start the interactive Studio dev server
npm --prefix site run dev
```

Visit `http://localhost:4321` in your browser.

---

## Using Scenes in Your Project

### Web Component (No Build Step)

```html
<script type="module" src="https://ascii.navinhill.com/ascii.js"></script>

<ascii-art piece="ocean-sunset"></ascii-art>
```

### React & Next.js

```tsx
import { Ascii } from "./components/ascii";
import { oceanSunset } from "./pieces/ocean-sunset";

export default function Hero() {
  return <Ascii piece={oceanSunset} options={{ fps: 20 }} />;
}
```

### Astro

```astro
---
import Ascii from "./components/Ascii.astro";
---

<Ascii piece="ocean-sunset" />
```

### Terminal CLI

```sh
# Run locally using the bundled CLI
node dist/cli.js ocean-sunset
```

---

## Deployment

ASCII Scene Studio is built on Astro and deployed to **Vercel** with custom routing and DNS managed through **Cloudflare**.

* **Production URL**: `https://ascii.navinhill.com`
* **Vercel Root Directory**: `site`
* **Analytics**: Integrated `@vercel/analytics` and `@vercel/speed-insights`.

---

## Architecture

```
ascii/
├── src/               # Core engine, procedural shaders, pieces, and math kit
│   ├── kit/           # Generative recipes, 3D math, fields, and particle tools
│   ├── pieces/        # 240+ scene and component implementations
│   └── studio/        # Studio state engine, presets, and code generation
├── site/              # Production web application (Astro + SSR adapter)
│   ├── src/pages/     # Studio (/studio/), docs, banners, and piece views
│   └── vercel.json    # Vercel deployment routes, headers, and redirects
└── package.json       # Root package and engine build pipeline
```

---

## Author

Created and maintained by **[Navin Hill](https://github.com/jamesnavinhill)** ([navinhill.com](https://navinhill.com)).

## License

[MIT](LICENSE) © 2026 Navin Hill
