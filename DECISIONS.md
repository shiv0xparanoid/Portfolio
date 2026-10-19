# Decisions log

## 2026-10-12 — Keep Nuxt 4

- **What:** Keep the existing Nuxt 4 + Vue + TypeScript application instead of migrating to Next.js.
- **Why:** The workspace already contains the working Nuxt shell, Nitro API route, Three.js, GSAP and Lenis. A migration would spend the task budget on framework churn rather than the story and MEG.
- **Alternatives:** Next.js App Router, Astro, a static HTML rebuild.
- **Trade-off:** The design brief mentioned Next.js, but Nuxt provides the same serverless boundary and is the existing reproducible stack.

## 2026-10-12 — Canonical content moved to `/content`

- **What:** Add validated JSON under `content/`; preserve `data/` as the original source drop but do not import it.
- **Why:** The site must be editable without changing Vue components, and the original YAML-ish markdown parser was too fragile for nested content.
- **Alternatives:** Keep `/data`, parse `bio.md` at runtime, use a CMS.
- **Trade-off:** There are two content folders for now, but only `/content` is live and the README makes that boundary explicit.

## 2026-10-12 — No invented facts

- **What:** Keep links, media, contact details, outcomes, testimonials, press and talks as placeholders until supplied; show owner-provided program records only with an explicit owner-reported status.
- **Why:** The intake answers say the exact URLs, outcomes, media and social proof will be provided later. Existing guessed values are not public facts.
- **Alternatives:** Use the old guessed GitHub/LinkedIn/email values, use stock visuals or add plausible metrics.
- **Trade-off:** Contact and social proof sections have honest empty states and the CRT shows designed no-media screens.

## 2026-10-12 — One persistent MEG canvas

- **What:** `PersistentTelebot.vue` owns the only `Telebot3D` instance and follows hero/Ask anchors; sections reserve anchor geometry but never mount a second canvas. MEG is the public name; `Telebot*` remains an internal compatibility contract.
- **Why:** A single scene preserves character continuity and avoids duplicated WebGL contexts, texture memory and conflicting gaze state.
- **Alternatives:** One MEG component per chapter, a static image outside the hero, a route-level canvas.
- **Trade-off:** MEG placement is managed by `ResizeObserver`/`IntersectionObserver`; it is more deliberate than normal flow but prevents clipping and duplicated work.

## 2026-10-12 — Procedural 3D instead of missing attachments

- **What:** Build the CRT, ringed neck, knit sweater, harness, three cables, headphones and screen shader in Three.js.
- **Why:** The named `TvHeadScene.jsx`, `ScreenReel.js` and `telebot-portfolio.html` attachments were not present in the workspace when implementation started.
- **Alternatives:** Wait for the attachments, use a stock model, invent a glTF asset.
- **Trade-off:** The code follows the written visual brief and exposes a stable controller so an attached scene can replace internals later.

## 2026-10-12 — Grounded chat is server-authored

- **What:** Anthropic is an optional server-only routing layer. The server validates source IDs and tools, then constructs the answer from canonical content.
- **Why:** A prompt-only instruction is not enough to guarantee that a model will not invent a metric or citation. Server-authored answer templates make the no-fabrication rule testable.
- **Alternatives:** Stream raw model prose, use a client API key, omit AI until content is complete.
- **Trade-off:** Live answers are less free-form, but they are honest and useful even without a key through the deterministic fallback bank.

## 2026-10-12 — Route project case studies

- **What:** Projects are deep-linkable at `/projects/:id` while the main story remains one scroll.
- **Why:** The brief asks for full case-study pages and deep links for citations. A route makes each project shareable without duplicating the main narrative.
- **Alternatives:** Modal only, hash-only case studies.
- **Trade-off:** Page transitions are simple Nuxt navigation for now; shared WebGL state remains in the home shell.

## 2026-10-12 — Sound and motion are opt-in / respectful

- **What:** Sound defaults off, quality can be low/high, and `prefers-reduced-motion` renders a static MEG frame and disables non-essential motion.
- **Why:** This is safer for visitors and preserves mobile performance.
- **Alternatives:** Autoplay audio, always-high WebGL, motion-only content.
- **Trade-off:** The default is calmer than a fully animated award-site demo, but it is keyboard and mobile usable.

## 2026-10-15 — Capabilities became a proof wall

- **What:** Replace the flat capability table with grouped Spotlight Cards. Each group now lists the skills and the projects or portfolio systems built with them.
- **Why:** A skill list is more useful when it connects directly to shipped experiments such as HOLO✦PAD, QVANTA, Saathi / Samvaad, and this portfolio.
- **Motion:** Desktop uses a pinned GSAP horizontal track with card-level vertical parallax; small screens use native horizontal overflow; reduced-motion and low-quality modes use a static grid.
- **21st.dev:** `app/components/ui/SpotlightCard.vue` is a local Vue adaptation of the 21st.dev Spotlight Card pattern. No React or Tailwind runtime was added to the Nuxt app.
- **Trade-off:** The horizontal choreography is intentionally disabled for touch/reduced-motion/low-quality paths so the content remains reachable and keyboard-friendly.

## 2026-10-16 — Reuse the parallax track for recognition

- **What:** Extract the pinned horizontal track into `useHorizontalParallax.ts` and apply it to the active People chapter's recognition wall.
- **Why:** Capabilities and awards now share one motion primitive: desktop scroll choreography, native touch overflow, and static reduced-motion/low-quality fallbacks.
- **Honesty:** The recognition wall renders owner-reported program records only when each has an official program-context link. Private correspondence is summarized without publishing credentials or personal contact details.

## Checks recorded

- `npx vue-tsc --noEmit` — passed on 2026-10-12.
- `npm run build` — passed on 2026-10-12. Nuxt emitted non-fatal `:deep` minifier warnings before the CSS cleanup and large-chunk guidance; follow-up browser verification is still required.
- `npm run test` — passed after the capabilities update: `vue-tsc --noEmit` plus `nuxt build`.
- `npx playwright test --workers=1 --timeout=120000` — 4 of 5 passed after the WebGL fallback harness was added; the existing axe smoke test still reports serious color-contrast violations across the pre-existing light theme and needs a separate accessibility pass.
- `npm ls playwright @playwright/test lighthouse @axe-core/playwright --depth=0` — no optional browser QA packages installed at the time of this log.
- The referenced MEG attachments were not found in the workspace search.
