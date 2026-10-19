<!--
  Local Vue adaptation of the 21st.dev Spotlight Card pattern. The registry
  publishes React/Tailwind components; keeping this version local preserves
  the Nuxt/Vue stack and makes the interaction portable.
-->
<script setup lang="ts">
interface SpotlightCardProps {
  eyebrow?: string
  title: string
  description?: string
  index?: string | number
  tags?: string[]
}

const props = withDefaults(defineProps<SpotlightCardProps>(), {
  tags: () => [],
})

const updateSpotlight = (event: MouseEvent) => {
  const card = event.currentTarget as HTMLElement | null
  if (!card) return

  const bounds = card.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return

  const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100))
  const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100))

  card.style.setProperty('--spotlight-x', `${x}%`)
  card.style.setProperty('--spotlight-y', `${y}%`)
  card.style.setProperty('--spotlight-opacity', '0.18')
}

const resetSpotlight = (event: MouseEvent) => {
  const card = event.currentTarget as HTMLElement | null
  card?.style.setProperty('--spotlight-opacity', '0')
}
</script>

<template>
  <article
    class="spotlight-card"
    @mousemove="updateSpotlight"
    @mouseleave="resetSpotlight"
  >
    <div class="spotlight-card__body">
      <header class="spotlight-card__header">
        <div>
          <p v-if="props.eyebrow" class="spotlight-card__eyebrow">
            {{ props.eyebrow }}
          </p>
          <h2 class="spotlight-card__title">
            {{ props.title }}
          </h2>
        </div>

        <span
          v-if="props.index !== undefined && props.index !== null && props.index !== ''"
          class="spotlight-card__index"
          aria-hidden="true"
        >
          {{ props.index }}
        </span>
      </header>

      <p v-if="props.description" class="spotlight-card__description">
        {{ props.description }}
      </p>

      <ul v-if="props.tags.length" class="spotlight-card__tags" aria-label="Tags">
        <li v-for="(tag, tagIndex) in props.tags" :key="`${tag}-${tagIndex}`">
          {{ tag }}
        </li>
      </ul>

      <div v-if="$slots.default" class="spotlight-card__extra">
        <slot />
      </div>
    </div>
  </article>
</template>

<style scoped>
.spotlight-card {
  --spotlight-x: 50%;
  --spotlight-y: 50%;
  --spotlight-opacity: 0;

  position: relative;
  display: flex;
  min-height: 100%;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg, 20px);
  background: var(--bg-elev, var(--bg));
  color: var(--text, var(--ink));
  box-shadow: var(--shadow-1, 0 1px 2px rgb(0 0 0 / 5%));
  transition:
    border-color var(--dur-s, 240ms) var(--ease-out, ease),
    box-shadow var(--dur-s, 240ms) var(--ease-out, ease);
}

.spotlight-card::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  content: '';
  pointer-events: none;
  background: radial-gradient(
    420px circle at var(--spotlight-x) var(--spotlight-y),
    var(--accent),
    transparent 68%
  );
  opacity: var(--spotlight-opacity);
  transition: opacity var(--dur-s, 240ms) var(--ease-out, ease);
}

.spotlight-card:hover,
.spotlight-card:focus-within {
  border-color: var(--line-strong, var(--accent));
  box-shadow: var(--shadow-2, 0 12px 36px rgb(0 0 0 / 12%));
}

.spotlight-card:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.spotlight-card:focus-within::before {
  opacity: 0.12;
}

.spotlight-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-5, 24px);
  width: 100%;
  padding: clamp(20px, 3vw, 36px);
}

.spotlight-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4, 16px);
}

.spotlight-card__eyebrow,
.spotlight-card__index,
.spotlight-card__tags {
  font-family: var(--font-mono, ui-monospace, monospace);
}

.spotlight-card__eyebrow {
  margin: 0 0 var(--space-2, 8px);
  color: var(--accent);
  font-size: var(--fs-12, 12px);
  letter-spacing: var(--ls-mono, 0.08em);
  line-height: 1.2;
  text-transform: uppercase;
}

.spotlight-card__title {
  margin: 0;
  color: var(--text, var(--ink));
  font-family: var(--font-display, system-ui, sans-serif);
  font-size: clamp(24px, 3.2vw, 42px);
  font-weight: var(--weight-display, 500);
  letter-spacing: var(--ls-head, -0.02em);
  line-height: var(--lh-tight, 0.95);
}

.spotlight-card__index {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: var(--fs-12, 12px);
  font-variant-numeric: var(--font-variant-numeric, tabular-nums);
  letter-spacing: var(--ls-mono, 0.08em);
  line-height: 1.2;
}

.spotlight-card__description {
  max-width: 55ch;
  margin: 0;
  color: var(--text-muted, var(--muted));
  font-size: var(--fs-18, 18px);
  line-height: var(--lh-body, 1.65);
}

.spotlight-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
  margin: 0;
  padding: 0;
  color: var(--text-muted, var(--muted));
  font-size: var(--fs-12, 12px);
  list-style: none;
}

.spotlight-card__tags li {
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill, 999px);
  letter-spacing: 0.04em;
}

.spotlight-card__extra {
  margin-top: auto;
  padding-top: var(--space-2, 8px);
}

.spotlight-card :deep(:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .spotlight-card,
  .spotlight-card::before {
    transition: none;
  }
}
</style>
