# particle-engine

Rust WASM particle engine for Nuxt portfolio site.

## Build

```bash
# Build the WASM module
cargo build --target wasm32-unknown-unknown --release

# Generate JS bindings with wasm-bindgen
wasm-bindgen target/wasm32-unknown-unknown/release/particle_engine.wasm --out-dir ./pkg --target web
```

## Usage from JavaScript

```js
import init, { ParticleEngine, perlin2, fbm } from './pkg/particle_engine.js';

await init();

const engine = ParticleEngine.new();
engine.init(1000, 800, 600);

// Per frame:
engine.update(16.67);
const count = engine.count();

// Read positions (Float32Array: x0, y0, x1, y1, ...)
const positions = new Float32Array(
  wasm.memory.buffer,
  engine.get_positions(),
  count * 2
);

// Read colors (Uint8Array: r0, g0, b0, a0, r1, g1, b1, a1, ...)
const colors = new Uint8Array(
  wasm.memory.buffer,
  engine.get_colors(),
  count * 4
);

// Attract particles to mouse position
engine.attract_to(mouseX, mouseY, 5000.0);

// Noise utilities
const n = perlin2(x, y, time);
const f = fbm(x, y, 5);
```
