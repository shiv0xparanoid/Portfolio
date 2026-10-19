<script setup lang="ts">
</script>

<template>
  <div class="grain-overlay" aria-hidden="true">
    <svg
      class="grain-svg"
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grainNoise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="4"
          stitchTiles="stitch"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainNoise)" />
    </svg>
  </div>
</template>

<style>
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.03;
  mix-blend-mode: multiply;
}

.grain-svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
