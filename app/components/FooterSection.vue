<script setup lang="ts">
import { ref } from 'vue'

const backToTopRef = ref<HTMLElement | null>(null)
const footerRef = ref<HTMLElement | null>(null)

useReveal(footerRef, { stagger: 80, selector: '.footer-reveal', threshold: 0.1 })

const { lenis } = useLenisSmooth()

useMagnetic(backToTopRef, { strength: 0.4, scale: 1.05 })

const scrollToTop = () => {
  if (lenis.value) {
    lenis.value.scrollTo(0, { immediate: false })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const studioLinks = [
  { label: 'Location', value: 'Remote / Worldwide' },
  { label: 'Founded', value: '2021' }
]

const socialLinks = ['Instagram', 'Twitter', 'Behance', 'Dribbble', 'LinkedIn']

const contactLinks = [
  { label: 'Email', value: 'hello@emotion-agency.com', href: 'mailto:hello@emotion-agency.com' },
  { label: 'Phone', value: '+1 (555) 012-3456', href: 'tel:+15550123456' }
]

const legalLinks = ['Privacy', 'Terms', 'Cookies']
</script>

<template>
  <footer class="footer-section" ref="footerRef">
    <div class="container">
      <div class="footer-row footer-row-1 footer-reveal">
        <div class="footer-logo">
          <span class="logo-text">Em<span class="logo-o">o</span>ti<span class="logo-e">o</span>n</span>
        </div>
        <button
          class="back-to-top magnetic"
          ref="backToTopRef"
          @click="scrollToTop"
        >
          <span class="btt-text">Back to top</span>
          <span class="btt-arrow">↑</span>
        </button>
      </div>

      <div class="footer-row footer-row-2">
        <div class="footer-col footer-col-studio footer-reveal">
          <h4 class="col-heading">Studio</h4>
          <ul class="col-list">
            <li v-for="item in studioLinks" :key="item.label" class="col-item">
              <span class="item-label">{{ item.label }}</span>
              <span class="item-value">{{ item.value }}</span>
            </li>
          </ul>
        </div>

        <div class="footer-col footer-col-social footer-reveal">
          <h4 class="col-heading">Social</h4>
          <ul class="col-list col-list-links">
            <li v-for="social in socialLinks" :key="social" class="col-item">
              <a href="#" class="col-link">{{ social }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-col footer-col-contact footer-reveal">
          <h4 class="col-heading">Contact</h4>
          <ul class="col-list col-list-links">
            <li v-for="item in contactLinks" :key="item.label" class="col-item">
              <a :href="item.href" class="col-link">{{ item.value }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-col footer-col-legal footer-reveal">
          <h4 class="col-heading">Legal</h4>
          <ul class="col-list col-list-links">
            <li v-for="link in legalLinks" :key="link" class="col-item">
              <a href="#" class="col-link">{{ link }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-row footer-row-3 footer-reveal">
        <span class="copyright">© 2026 Emotion Agency — Interfaces People Remember</span>
        <span class="made-with">Made with care ↪</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-section {
  width: 100%;
  border-top: 1px solid rgba(26, 26, 46, 0.1);
  padding: 80px 0 40px;
  background: var(--bg);
  position: relative;
}

.footer-row {
  width: 100%;
}

.footer-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 80px;
  padding-bottom: 60px;
  border-bottom: 1px solid rgba(26, 26, 46, 0.08);
}

.footer-logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(48px, 8vw, 140px);
  line-height: 0.9;
  color: var(--text);
  letter-spacing: -0.03em;
}

.logo-o {
  color: var(--accent);
}

.logo-e {
  display: inline-block;
  transform: scaleX(-1);
  color: var(--accent);
}

.back-to-top {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 32px;
  border: 1px solid rgba(26, 26, 46, 0.2);
  border-radius: 999px;
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 300;
  color: var(--text);
  background: transparent;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  z-index: 0;
}

.back-to-top::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: -1;
  border-radius: 999px;
}

.btt-text,
.btt-arrow {
  position: relative;
  z-index: 1;
}

.back-to-top:hover {
  color: var(--bg);
  border-color: var(--accent);
}

.back-to-top:hover::before {
  transform: scaleY(1);
}

.btt-arrow {
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 16px;
}

.back-to-top:hover .btt-arrow {
  transform: translateY(-4px);
}

.footer-row-2 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 48px;
  margin-bottom: 80px;
}

.col-heading {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 28px;
}

.col-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.col-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.col-list-links .col-item {
  flex-direction: row;
  gap: 0;
}

.item-label {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.item-value {
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.4;
}

.col-link {
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 300;
  color: var(--text);
  position: relative;
  display: inline-block;
  background-image: linear-gradient(var(--text), var(--text));
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: 0 100%;
  transition: background-size 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s ease;
  padding-bottom: 1px;
}

.col-link:hover {
  background-size: 100% 1px;
  color: var(--accent);
  background-image: linear-gradient(var(--accent), var(--accent));
}

.footer-row-3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 32px;
  border-top: 1px solid rgba(26, 26, 46, 0.08);
}

.copyright {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.made-with {
  font-family: var(--serif);
  font-size: 14px;
  font-weight: 300;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.3s ease, transform 0.3s ease;
}

.made-with:hover {
  color: var(--accent);
  transform: translateX(4px);
}

@media (max-width: 900px) {
  .footer-section {
    padding: 60px 0 30px;
  }
  .footer-row-1 {
    flex-direction: column;
    align-items: flex-start;
    gap: 32px;
    margin-bottom: 48px;
    padding-bottom: 40px;
  }
  .logo-text {
    font-size: 64px;
  }
  .back-to-top {
    padding: 14px 26px;
    font-size: 14px;
  }
  .footer-row-2 {
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
    margin-bottom: 48px;
  }
  .footer-row-3 {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding-top: 24px;
  }
}

@media (max-width: 500px) {
  .footer-row-2 {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
