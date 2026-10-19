import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'

const widths = [390, 768, 1440, 2560]
const expectedWebglFallback = /THREE\.WebGLRenderer|WebGL could not start|WebGL unavailable/i

async function disableWebgl(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return originalGetContext.call(this, type, ...args)
    }
  })
}

test.beforeEach(async ({ page }) => {
  await disableWebgl(page)
})

test('the story renders at the requested widths without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !expectedWebglFallback.test(message.text())) errors.push(message.text())
  })
  await page.addInitScript(() => {
    window.localStorage.setItem('ss-portfolio-settings-v1', JSON.stringify({ sound: false, theme: 'light', quality: 'low' }))
  })

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('#ch1')).toBeVisible()
    await expect(page.locator('.loader')).toHaveClass(/is-dismissed/, { timeout: 5_000 })
    await expect(page.locator('#ch1, #ch2, #ch3, #ch4, #ch5, #ch6, #ch7, #ch8, #ch9, #ch10, #extras')).toHaveCount(11)
    await expect(page.locator('.nav__index')).toHaveCount(0)
    await expect(page.locator('.chapter .section__head > .eyebrow')).toHaveCount(0)
    const screenshotDir = path.resolve('artifacts/screenshots')
    fs.mkdirSync(screenshotDir, { recursive: true })
    await page.screenshot({ path: path.join(screenshotDir, `portfolio-${width}.png`), fullPage: true })
  }

  expect(errors, errors.join('\n')).toEqual([])
})

test('hero stays front-facing, settings persist, and reduced-motion still exposes the story', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('#ch1')).toHaveAttribute('data-hero-pose', 'front')
  await expect(page.locator('#ch1')).toHaveAttribute('data-hero-final-deg', '0')
  await expect(page.locator('#ch1')).toHaveAttribute('data-hero-scroll-release', 'front-pose')
  await expect(page.locator('#ch1 .hero__eyebrow, #ch1 .hero__role, #ch1 .hero__meta')).toHaveCount(0)
  await expect(page.locator('#ch1 .hero__field, #ch1 .hero__field-ring')).toHaveCount(0)
  await expect(page.locator('#ch9')).toContainText('Ask MEG')
  await expect(page.getByRole('button', { name: 'Open quick MEG chat' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Telebot')
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  const switches = page.getByRole('switch')
  await switches.nth(1).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('.settings__close').click()
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#ch9')).toContainText('Ask MEG')
})

test('capabilities has a bounded horizontal track and a reduced-motion fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('#ch3 .capabilities__stage')).toHaveAttribute('data-parallax-mode', 'horizontal')
  await expect(page.locator('#ch3 .capabilities__card')).toHaveCount(5)
  await expect(page.locator('#ch3')).toContainText('BUILT WITH THIS')

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(desktopOverflow).toBeLessThanOrEqual(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#ch3 .capabilities__stage')).toHaveAttribute('data-parallax-mode', 'static')
  await expect(page.locator('#ch3 .capabilities__track')).toBeVisible()
})

test('recognition wall has public program records and a horizontal parallax stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('#ch8 .people__awards-stage')).toHaveAttribute('data-parallax-mode', 'horizontal')
  await expect(page.locator('#ch8 .people__awards-intro-card')).toBeVisible()
  await expect(page.locator('#ch8 .people__award-card')).toHaveCount(6)
  await expect(page.locator('#ch8 .people__awards-track')).toContainText('Nintendo')
  await expect(page.locator('#ch8 .people__awards-track')).toContainText('Google Developer Program')
  await expect(page.locator('#ch8 .people__awards-track')).toContainText('Smart India Hackathon 2026')
  await expect(page.locator('#ch8 .people__awards-track')).toContainText('McKinsey.org Forward')
  await expect(page.locator('#ch8 .people__award-link').nth(0)).toHaveAttribute('href', /nintendo\.co\.jp/)
  await expect(page.locator('#ch8 .people__award-link').nth(1)).toHaveAttribute('href', /developers\.google\.com\/program/)

  const recognitionLayout = await page.locator('#ch8 .people__recognition').evaluate((element) => {
    const card = element.querySelector<HTMLElement>('.people__award-card')
    return {
      width: element.getBoundingClientRect().width,
      cardWidth: card?.getBoundingClientRect().width || 0,
      columns: getComputedStyle(element.parentElement!).gridTemplateColumns
    }
  })
  expect(recognitionLayout.width).toBeGreaterThan(1000)
  expect(recognitionLayout.cardWidth).toBeGreaterThan(400)
  expect(recognitionLayout.columns.split(' ').length).toBe(1)

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(desktopOverflow).toBeLessThanOrEqual(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#ch8 .people__awards-stage')).toHaveAttribute('data-parallax-mode', 'static')
  await expect(page.locator('#ch8 .people__awards-track')).toBeVisible()
})

test('extras presents the three released songs with a public SoundCloud link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('.extras__music')).toBeVisible()
  await expect(page.locator('.extras__header-meta')).toContainText('ARCHIVE / 05')
  await expect(page.locator('.extras__header-note')).toBeVisible()
  const musicSurface = await page.locator('.extras__music').evaluate((element) => {
    const style = getComputedStyle(element)
    return { backgroundImage: style.backgroundImage, borderRadius: style.borderRadius }
  })
  expect(musicSurface.backgroundImage).not.toBe('none')
  expect(musicSurface.borderRadius).not.toBe('0px')
  await expect(page.locator('[data-music-track]')).toHaveCount(3)
  await expect(page.locator('.extras__music')).toContainText('Unshaken')
  await expect(page.locator('.extras__music')).toContainText('she was my song')
  await expect(page.locator('.extras__music')).toContainText('silent battels')
  await expect(page.locator('.extras__soundcloud-link')).toHaveAttribute('href', 'https://soundcloud.com/shivang-sagar')
  await expect(page.locator('.extras__soundcloud-link')).toHaveAttribute('target', '_blank')
  await expect(page.locator('.extras__soundcloud-link')).toHaveAttribute('rel', /noopener/)
  await expect(page.locator('.music-releases__stage')).toBeVisible()
  await expect(page.getByRole('button', { name: /Next release/ })).toBeVisible()
  await page.getByRole('button', { name: /Next release/ }).click()
  await expect(page.locator('#music-releases-title')).toContainText('she was my song')
})

test('contact presents the Orbit scene, mailto form, and supplied public profiles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })

  await expect(page.locator('#ch10')).toContainText("Let's talk")
  await expect(page.locator('#ch10 .section__head')).toHaveCount(0)
  await expect(page.locator('.contact__orbit-canvas')).toHaveAttribute('role', 'img')
  await expect(page.locator('.contact__orbit-canvas')).toHaveAttribute('aria-label', /particles drifting in a column/)
  await expect(page.locator('.contact__orbit')).toContainText('Scroll and the dust settles into a face.')
  const orbitLayout = await page.locator('.contact__orbit').evaluate((element) => {
    const sticky = element.querySelector<HTMLElement>('.contact__orbit-sticky')
    return {
      hostHeight: element.getBoundingClientRect().height,
      viewportHeight: window.innerHeight,
      stageHeight: sticky?.getBoundingClientRect().height || 0,
      stickyPosition: sticky ? getComputedStyle(sticky).position : ''
    }
  })
  // CSS sticky reserves scroll room in the host; the visible stage stays viewport-sized.
  expect(orbitLayout.hostHeight).toBeGreaterThan(orbitLayout.viewportHeight * 3)
  expect(orbitLayout.hostHeight).toBeLessThan(orbitLayout.viewportHeight * 5)
  expect(orbitLayout.stageHeight).toBeCloseTo(orbitLayout.viewportHeight, 0)
  expect(orbitLayout.stickyPosition).toBe('sticky')
  await expect(page.locator('.contact__orbit > .pin-spacer')).toHaveCount(0)
  expect(await page.locator('#ch6').evaluate((element) => Boolean(element.compareDocumentPosition(document.getElementById('ch10')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
  expect(await page.locator('#ch9').evaluate((element) => Boolean(element.compareDocumentPosition(document.getElementById('ch10')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true)
  const chapterFlow = await page.evaluate(() => {
    const ask = document.getElementById('ch9')!.getBoundingClientRect()
    const contact = document.getElementById('ch10')!.getBoundingClientRect()
    return { askBottom: ask.bottom + window.scrollY, contactTop: contact.top + window.scrollY }
  })
  expect(chapterFlow.contactTop).toBeGreaterThanOrEqual(chapterFlow.askBottom - 1)
  await expect(page.locator('.contact__orbit-sticky')).toHaveCSS('background-color', /rgb\(/)

  await expect(page.locator('.contact__form')).toBeVisible()
  await expect(page.locator('#contact-name')).toHaveAttribute('required', '')
  await expect(page.locator('#contact-email')).toHaveAttribute('type', 'email')
  await expect(page.locator('#contact-email')).toHaveAttribute('required', '')
  await expect(page.locator('#contact-message')).toHaveAttribute('required', '')
  await expect(page.locator('.contact__email')).toHaveAttribute('href', 'mailto:shivangsagar529@gmail.com')

  await expect(page.locator('.contact__elsewhere a')).toHaveCount(3)
  await expect(page.locator('.contact__elsewhere a[href="https://github.com/shiv0xparanoid"]')).toBeVisible()
  await expect(page.locator('.contact__elsewhere a[href="https://leetcode.com/u/mellifluentShiv/"]')).toBeVisible()
  await expect(page.locator('.contact__elsewhere a[href="https://www.linkedin.com/in/shivang16062006/"]')).toBeVisible()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('.contact__orbit')).toHaveClass(/contact__orbit--reduced/)
  await expect(page.locator('.contact__orbit-fallback')).toBeVisible()
  await expect(page.locator('.contact__orbit-sticky')).toHaveCSS('position', 'relative')
  const reducedHostHeight = await page.locator('.contact__orbit').evaluate(element => element.getBoundingClientRect().height)
  expect(reducedHostHeight).toBeLessThan(900 * 1.5)
})

test('case study presents a premium editorial narrative at responsive widths', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/projects/holopad', { waitUntil: 'networkidle' })

    await expect(page.locator('.case-study')).toBeVisible()
    await expect(page.locator('.case-study__topline-meta')).toContainText('Case study')
    await expect(page.locator('.case-study__hero-signal')).toContainText('PRJCT/01')
    await expect(page.locator('.case-study__section')).toHaveCount(4)
    await expect(page.locator('.case-study__decision-index')).toHaveCount(3)
    await expect(page.locator('.case-study__outcome')).toBeVisible()
    await expect(page.locator('.case-study__media-placeholder')).toHaveCount(3)
    await expect(page.locator('.case-study__footer-link')).toHaveCount(2)

    const heroSurface = await page.locator('.case-study__hero-signal').evaluate((element) => {
      const style = getComputedStyle(element)
      return { backgroundImage: style.backgroundImage, borderRadius: style.borderRadius }
    })
    expect(heroSurface.backgroundImage).not.toBe('none')
    expect(heroSurface.borderRadius).not.toBe('0px')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  }
})

test('offline Ask MEG streams a grounded answer and project routes resolve', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const chip = page.getByRole('button', { name: /What has he shipped/ }).first()
  await chip.click()
  await expect(page.locator('#ch9')).toContainText('PRJCT/01', { timeout: 12_000 })
  await expect(page.locator('#ch9')).toContainText('Sources:', { timeout: 12_000 })
  await page.goto('/projects/holopad', { waitUntil: 'networkidle' })
  await expect(page.locator('h1')).toContainText('HOLO')
  await expect(page.locator('body')).toContainText('Problem')
})

test('axe finds no serious or critical violations on the home page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const result = await new AxeBuilder({ page }).analyze()
  const serious = result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
})
