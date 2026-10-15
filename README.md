<div align="center">

# ASCII Scene Studio

**Interactive ASCII scene studio, parameter synthesizer & animation engine in TypeScript.**

[Live Studio](https://ascii.navinhill.com) · [Documentation](https://ascii.navinhill.com/docs/) · [GitHub](https://github.com/jamesnavinhill/ascii) · [License](LICENSE)

[![Author](https://img.shields.io/badge/author-%40jamesnavinhill-181717?logo=github&logoColor=white)](https://github.com/jamesnavinhill)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-181717?logo=typescript&logoColor=white)](src/types.ts)
[![License](https://img.shields.io/badge/license-MIT-181717)](LICENSE)

</div>

---

## Overview

ASCII Scene Studio is a real-time creative coding engine and interactive studio for procedural ASCII scenes, generative animations, UI components, and brand graphics.

Explore, fine-tune, and export procedural ASCII animations directly from your browser at [ascii.navinhill.com](https://ascii.navinhill.com).

- **Real-Time Synthesis**: Adjust wind, waves, colors, sun position, geometry, and rendering fidelity live in the studio.
- **Multiple Output Targets**: Export pure TypeScript modules, React/Next.js components, Astro tags, Web Components, SVGs, or ANSI terminal streams.
- **240+ Curated Pieces**: Rich scenes, procedural shaders, UI data widgets, 3D wireframe math, physics simulations, and generative patterns.
- **Zero Heavy Dependencies**: Lightweight, performant canvas and text rendering with minimal memory footprint.

---

## Quick Start

### Run the Studio Locally

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

Open `http://localhost:4321` in your browser.

---

## Deployment Configuration

The studio web application is built with Astro and optimized for edge deployment on **Vercel** with DNS managed via **Cloudflare**.

### Vercel Project Setup

1. **Import Repository**: Connect `https://github.com/jamesnavinhill/ascii` in Vercel.
2. **Root Directory**: Set to **`site`** (Critical: do not select `src` or root).
3. **Include Outside Files**: Ensure *"Include source files outside of the Root Directory in the Build Step"* is **enabled** (allows the web app to build the TypeScript engine in the parent directory).
4. **Framework Preset**: Auto-detected as **Astro**.
5. **Install Command**: `npm ci --prefix .. && npm ci` (configured automatically in `site/vercel.json`).
6. **Build Command**: `npm run build`.

### Custom Domain & Cloudflare DNS

To route `ascii.navinhill.com`:

1. In your Cloudflare DNS dashboard under `navinhill.com`, add a CNAME record:
   - **Type**: `CNAME`
   - **Name**: `ascii`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy Status**: `DNS only` (Gray Cloud) during initial verification and SSL issuance.
2. In Vercel Project Settings &rarr; **Domains**, add `ascii.navinhill.com`.
3. Once SSL certificates are verified and active, Cloudflare Proxy (Orange Cloud) can be optionally enabled with SSL mode set to **Full (Strict)**.

### Analytics

The studio layout is pre-configured with `@vercel/analytics` and `@vercel/speed-insights`. To activate:
- In the Vercel dashboard for this project, navigate to **Analytics** and **Speed Insights**, and click **Enable**. Telemetry streams automatically with no additional code required.

---

## Using Pieces in Your Project

### React & Next.js

```tsx
import { Ascii } from "ascii.rest/react";
import { donut } from "ascii.rest/pieces";

export default function Hero() {
  return <Ascii piece={donut} options={{ fps: 15 }} />;
}
```

### Astro

```astro
---
import Ascii from "ascii.rest/astro";
---

<Ascii piece="ocean-sunset" />
```

### HTML / Web Component

```html
<script type="module" src="https://ascii.navinhill.com/ascii.js"></script>
<ascii-art piece="donut"></ascii-art>
```

### Terminal CLI

```sh
npx ascii.rest ocean-sunset
```

---

## Repository Structure

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

## Author & Credits

- Maintained & evolved by [Navin Hill](https://github.com/jamesnavinhill).
- Upstream foundations and original piece library by [@bas3line](https://github.com/bas3line).

## License

[MIT](LICENSE) © Navin Hill
