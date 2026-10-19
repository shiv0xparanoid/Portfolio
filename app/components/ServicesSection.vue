<template>
  <section class="services section" ref="sectionRef">
    <div class="container">
      <div class="services__header">
        <div class="services__eyebrow reveal-text" ref="eyebrowRef">
          <span>What we do</span>
        </div>
      </div>

      <div class="services__grid">
        <article
          v-for="service in services"
          :key="service.id"
          class="services__card"
          data-reveal
        >
          <div class="services__card-inner">
            <span class="services__num">
              {{ String(service.id).padStart(2, '0') }}
            </span>
            <h3 class="services__title">
              {{ service.title }}
            </h3>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { services } from '~/data/content'

const sectionRef = ref<HTMLElement | null>(null)
const eyebrowRef = ref<HTMLElement | null>(null)

useReveal(sectionRef, {
  selector: '[data-reveal]',
  stagger: 60,
  threshold: 0.1,
})

useReveal(eyebrowRef, { threshold: 0.1 })
</script>

<style scoped>
.services {
  background: var(--bg);
  padding-top: 160px;
  padding-bottom: 160px;
}

.services__header {
  margin-bottom: 100px;
}

.services__eyebrow {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(40px, 6vw, 90px);
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text);
  display: block;
  overflow: hidden;
}

.services__eyebrow > span {
  display: block;
}

.services__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(26, 26, 46, 0.12);
  border: 1px solid rgba(26, 26, 46, 0.12);
  border-radius: 20px;
  overflow: hidden;
}

.services__card {
  background: var(--bg);
  position: relative;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.services__card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--text);
  transform: translateY(100%);
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}

.services__card:hover::before {
  transform: translateY(0%);
}

.services__card-inner {
  position: relative;
  z-index: 1;
  padding: 40px 32px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  transition: color 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.services__card:hover .services__card-inner {
  color: var(--bg);
}

.services__num {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  transition: color 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.services__card:hover .services__num {
  color: rgba(242, 237, 255, 0.6);
}

.services__title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(18px, 1.4vw, 24px);
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--text);
  transition: color 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.services__card:hover .services__title {
  color: var(--bg);
}

@media (max-width: 1100px) {
  .services__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .services__grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .services__header {
    margin-bottom: 60px;
  }

  .services__card-inner {
    padding: 28px 24px;
    min-height: 150px;
  }
}

@media (max-width: 480px) {
  .services__grid {
    grid-template-columns: 1fr;
  }
}
</style>
