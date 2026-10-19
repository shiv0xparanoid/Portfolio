<template>
  <section class="approach section" ref="sectionRef">
    <div class="container">
      <div class="approach__header">
        <!-- slide: small label glides in -->
        <div class="approach__eyebrow" data-split="slide">Approach</div>
        <!-- drop: letters fall in and bounce, like blocks being placed ("We build") -->
        <h2 class="approach__title" data-split="drop" data-split-delay="0.1">We build</h2>
      </div>

      <div class="approach__grid">
        <!-- each column rises as a block (useReveal) -->
        <div
          v-for="(item, index) in approach"
          :key="item.num"
          class="approach__column"
          :class="{ 'approach__column--divider': index < approach.length - 1 }"
          data-reveal
        >
          <div class="approach__column-inner">
            <div class="approach__accent-bar"></div>
            <div class="approach__column-content">
              <!-- scramble: the counter shuffles into place -->
              <div v-once class="approach__num" data-split="scramble">{{ item.num }} / 03</div>
              <!-- flip: the big word flips up letter by letter -->
              <h3 v-once class="approach__column-title" data-split="flip">{{ item.title }}</h3>
              <div class="approach__lines">
                <!-- blurFocus, one line after another -->
                <p
                  v-for="(line, i) in item.lines"
                  :key="i"
                  v-once
                  class="approach__line"
                  data-split="blurFocus"
                  :data-split-delay="0.2 + i * 0.18"
                >{{ line }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { approach } from '~/data/content'
import { useSplitReveal } from '~/composables/useSplitReveal'
import { useReveal } from '~/composables/useReveal'

const sectionRef = ref<HTMLElement | null>(null)

// letters / words: everything with data-split="..."
useSplitReveal(sectionRef)

// whole columns (note: the option is staggerMs, not stagger)
useReveal(sectionRef, {
  selector: '[data-reveal]',
  staggerMs: 180,
  threshold: 0.15,
})
</script>

<style scoped>
.approach {
  background: var(--bg);
  padding-top: 160px;
  padding-bottom: 160px;
}

.approach__header {
  margin-bottom: 120px;
}

.approach__eyebrow {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 24px;
  display: block;
}

.approach__title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(48px, 8vw, 140px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--text);
  display: block;
}

.approach__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  position: relative;
}

.approach__column {
  position: relative;
  padding: 0 40px;
}

.approach__column--divider::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: rgba(26, 26, 46, 0.12);
}

.approach__column-inner {
  position: relative;
  padding: 40px 0;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.approach__column:hover .approach__column-inner {
  transform: scale(1.02);
}

.approach__accent-bar {
  position: absolute;
  left: -40px;
  top: 40px;
  width: 3px;
  height: 0;
  background: transparent;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.approach__column:hover .approach__accent-bar {
  height: 120px;
  background: var(--accent);
}

.approach__column-content {
  position: relative;
}

.approach__num {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 40px;
}

.approach__column-title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(48px, 7vw, 110px);
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 40px;
}

.approach__lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.approach__line {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(18px, 2vw, 32px);
  line-height: 1.3;
  color: var(--text);
}

@media (max-width: 900px) {
  .approach__grid {
    grid-template-columns: 1fr;
    gap: 60px;
  }

  .approach__column {
    padding: 0;
  }

  .approach__column--divider::after {
    top: auto;
    bottom: -30px;
    left: 0;
    width: 100%;
    height: 1px;
  }

  .approach__accent-bar {
    left: 0;
  }

  .approach__header {
    margin-bottom: 80px;
  }
}
</style>