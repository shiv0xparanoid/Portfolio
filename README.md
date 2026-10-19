# Shivang Sagar — Technology, made tangible.

A single-scroll portfolio built around **MEG**, a persistent CRT-TV assistant. The page is an editorial story first: identity, origin, capabilities, one honest venture case file, research, impact, work, people, Ask MEG, contact, and extras.

The app is a Nuxt 4 + TypeScript codebase. Three.js is dynamically loaded for the MEG scene; the rest of the story remains SSR-friendly HTML and CSS.

## Run it

Requirements: Node.js `20.19.5` and npm 10+ (the pinned Node version is in `.nvmrc`).

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Production checks:

```bash
npm run typecheck
npm run test
npm run preview
```

`make test` is the single offline verification command used by the buildathon; it runs the typecheck and production build without needing an API key. The build is intentionally usable without an Anthropic key: `/api/chat` streams a deterministic, content-grounded offline answer instead.

### Docker

The production image builds from the committed lockfile and runs the Nuxt Nitro server on port `3000`:

```bash
docker build -t shivang-portfolio .
docker run --rm -p 3000:3000 shivang-portfolio
```

Open `http://localhost:3000` after the container starts.

## Content editing

Edit JSON only; no Vue changes are needed for normal content updates. The canonical files are in `content/` and are validated before use on the server and at the client content boundary.

| File | What it owns |
| --- | --- |
| `content/bio.json` | Name, role, tagline, pitch, origin lines, timeline and research focus. |
| `content/capabilities.json` | Numbered capabilities, their groups, and the builds that prove each skill. |
| `content/startups.json` | Startup case files. Only real ventures belong here. |
| `content/projects.json` | `PRJCT/NN` project records, decisions, outcomes, links and media. |
| `content/research.json` | Published writing separated from research focus areas. |
| `content/impact.json` | Owner-reported impact rows and source state. |
| `content/testimonials.json` | Real quotes, descriptors and honesty note. |
| `content/awards.json`, `content/press.json`, `content/talks.json` | Recognition and appearances. Owner-reported program records stay visibly marked. |
| `content/music.json` | Three-track discography and the public SoundCloud listening link. |
| `content/contact.json` | Public email, timezone, availability and social links. |
| `content/media.json` | Confirmed photos/videos for the CRT reel. |

Honesty rule: a fact without an owner-confirmed source stays `[PLACEHOLDER]` or `owner-reported-awaiting-source`. Placeholder URLs are rendered as copy, never as clickable links. Do not put secrets, private analytics exports or API keys in these files.

The old `data/` folder is preserved as the original content drop for reference. The application reads `content/` through `app/composables/usePortfolioContent.ts`.

### Capabilities and built work

The Capabilities chapter is a pinned horizontal scroll on larger screens, a native horizontal overflow track on small screens, and a static grid for reduced-motion or low-quality mode. Each domain card pairs the tools with the products and experiments they have already powered.

The cards use a locally owned Vue adaptation of the [21st.dev Spotlight Card](https://21st.dev/@jahed/components/spotlight-card) pattern in `app/components/ui/SpotlightCard.vue`. The pinned track behavior is shared by `app/composables/useHorizontalParallax.ts` and is also used by the People chapter's recognition wall. 21st publishes React/Tailwind components, while this project is Nuxt/Vue, so the interaction is adapted without adding a React runtime or a network dependency.

The Extras archive is a premium workbench index: timeline, tools, writing, experiments and music live in a restrained card system with a dark feature panel for the releases. Its `app/components/MusicReleases.client.vue` panel is a client-only editorial horizontal release track with generated disc studies, native touch/mouse scrolling, arrow/wheel/swipe navigation, an accessible track list, and a static reduced-motion mode. It keeps listening external through the public SoundCloud link and does not autoplay audio. The Contact chapter is a hero-like full-viewport `#ch10` placed after Ask MEG, reusing `app/components/ParticlePortrait.client.vue` and the local `/public/portrait-body.png` asset for the same WebGL particle-to-image assembly used by the home hero. The stage uses CSS sticky positioning inside reserved scroll space; GSAP/ScrollTrigger scrubs the portrait without inserting a pin spacer. Reduced motion shows the assembled image immediately and collapses the extra scroll space. The chapter also includes a `mailto:` contact form with the supplied public profiles; no CDN asset or backend is required.

## MEG

`app/components/PersistentTelebot.vue` mounts one canvas and follows `[data-telebot-anchor="hero"]` and `[data-telebot-anchor="ask"]`. It becomes a compact corner assistant when neither anchor is visible. The public assistant is named MEG; the internal component and state names remain `Telebot*` for compatibility. The scene is procedural in `app/three/TelebotScene.ts`; `app/three/ScreenReel.ts` owns the CRT channels, typed SS boot, terminal stream, media loading, scanlines, vignette, pointer lens/ripple, click shockwave and project preview mode.

The canvas is lazy-loaded, pauses when off-screen or the tab is hidden, disposes all geometries/materials/textures, honors reduced motion, and drops to low quality after sustained slow frames. Missing media produces an explicit designed no-media screen; it does not fabricate a photograph.

The state surface in `app/composables/useTelebot.ts` is the contract for chat tools and future attached assets. It includes `setChannel`, `setMood`, `streamText`, `playMedia`, `setProjectPreview`, `highlight`-compatible metric navigation, and `dance`.

## Grounded Ask MEG

The mini prompt and full `#ch9` chapter share one transcript. The API accepts a bounded visitor or recruiter brief and returns SSE records:

```text
{ type: "meta", mode }
{ type: "tool", name, args }
{ type: "token", text }
{ type: "sources", sources: [{ label, href }] }
{ type: "done" }
```

`server/api/chat.post.ts` validates input, rate-limits by a one-way address key, routes the request through a server-only Anthropic selector when configured, and then constructs the answer from validated canonical content. The model never writes portfolio facts or citations. Tool names and arguments are allowlisted again in the browser. Missing keys, provider errors and offline mode use the deterministic fallback bank in `app/composables/useTelebotChat.ts`.

### Environment variables

Copy `.env.example` to `.env` or configure these in Vercel. Never commit `.env`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NUXT_ANT_THROPIC_KEY` | server-only | Optional Anthropic API key. It is never sent to the browser. |
| `NUXT_ANTHROPIC_MODEL` | server-only | Optional model name available to your Anthropic account. |
| `NUXT_PUBLIC_SITE_URL` | public | Final HTTPS origin for sitemap and Person JSON-LD. Replace the placeholder before deploy. |

The exact model/provider is a deployment choice. The repository does not invent a future model alias; the route uses its documented fallback only when the variable is empty.

## Deploy to Vercel

1. Push/import this folder as a Nuxt project.
2. Add `NUXT_PUBLIC_SITE_URL` with the final HTTPS URL.
3. Add `NUXT_ANT_THROPIC_KEY` only if live selector routing is wanted. Offline grounded answers work without it.
4. Use the default Nuxt build command (`npm run build`). Vercel detects Nitro automatically.
5. Verify `/`, `/projects/holopad`, `/sitemap.xml`, `/robots.txt` and `/api/chat` after deploy.

The API rate limiter is intentionally bounded in-process. For a multi-region/high-volume deployment, put an edge rate limiter in front of `/api/chat` rather than pretending the process map is globally shared.

## QA notes

Actual checks run during this build are recorded in `DECISIONS.md` and the final handoff. The meaningful local checks are `npx vue-tsc --noEmit`, `npm run build`, the built preview smoke flow, and browser checks at the requested breakpoints. Lighthouse/axe/Playwright are not silently claimed: run the optional commands below after adding their browser binaries if you need CI reports.

```bash
npx playwright test
npx lighthouse http://localhost:3000 --view
```

## Replacing the procedural Telebot

The referenced `TvHeadScene.jsx`, `ScreenReel.js`, and `telebot-portfolio.html` were not present in the workspace during this build. The current implementation follows the written brief procedurally. If those files arrive, adapt them behind the existing `TelebotSceneController` surface and keep `useTelebot()` and the single `PersistentTelebot` mount unchanged.

## Project map

```text
app/pages/index.vue                 story order
app/pages/projects/[id].vue         deep-linkable case studies
app/components/PersistentTelebot   one-canvas placement shell
app/three/TelebotScene.ts           procedural 3D rig
app/three/ScreenReel.ts             shader + CRT screen module
content/                             editable canonical facts
shared/                              validation and SSE contracts
server/api/chat.post.ts             grounded AI boundary
server/utils/grounding.ts           deterministic answer/tool selection
```
