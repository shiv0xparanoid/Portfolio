<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:020a06,50:0b3d2a,100:39ff88&height=210&section=header&text=Technology%2C%20made%20tangible.&fontColor=eafff3&fontSize=44&fontAlignY=38&desc=a%20single-scroll%20portfolio%20narrated%20by%20MEG%2C%20a%20CRT-TV%20assistant&descAlignY=60&descSize=16" width="100%" />

<br/>

![Nuxt](https://img.shields.io/badge/Nuxt%204-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=black)
![Anthropic](https://img.shields.io/badge/Anthropic-191919?style=for-the-badge&logo=anthropic&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

**An editorial story first, a 3D experience second.**
Identity, origin, capabilities, a venture case file, research, impact, work, people, **Ask MEG**, contact.

[![GitDiagram](https://img.shields.io/badge/Explore%20on-GitDiagram-0b3d2a?style=flat-square)](https://gitdiagram.com/shiv0xparanoid/Portfolio)
[![License](https://img.shields.io/badge/License-MIT-39ff88?style=flat-square)](LICENSE)

[About](#-about) · [Workflow](#-workflow) · [Run It](#-run-it) · [Content](#-editing-content) · [MEG](#-meg) · [Deploy](#-deploy) · [Structure](#-project-map)

</div>

<br/>

## ✦ About

A personal portfolio of capabilities, awards and projects, built around **MEG**, a persistent CRT-TV assistant that follows you down the page.

- **Nuxt 4 + TypeScript.** The story stays SSR-friendly HTML and CSS, and Three.js is loaded dynamically, only for MEG's scene.
- **Content is JSON.** Edit files in `content/`, never touch Vue for a normal update.
- **Grounded AI.** MEG never writes facts. The model only *selects*, and answers are assembled from validated content with citations.
- **Works with zero keys.** No Anthropic key? `/api/chat` streams a deterministic offline answer.
- **Honest by design.** An unconfirmed fact stays `[PLACEHOLDER]` and is never rendered as a link.

<br/>

## ✦ Workflow

> 🔍 **Interactive version:** open this repo on **[GitDiagram](https://gitdiagram.com/shiv0xparanoid/Portfolio)** for the auto-generated, clickable architecture view. (Replace `github.com` with `gitdiagram.com` in any repo URL.) The diagrams below are the curated versions.

### 1 · System architecture

```mermaid
flowchart TB
    subgraph CONTENT["📄  content/ · single source of truth"]
        direction LR
        J["bio · capabilities · startups<br/>projects · research · impact<br/>awards · talks · contact …"]
    end

    subgraph SHARED["🛡️  shared/"]
        V["validation + SSE contracts"]
    end

    subgraph APP["🖥️  app/ · Nuxt 4 + Vue"]
        direction TB
        PG["pages/index.vue<br/>story chapters"]
        CASE["pages/projects/:id<br/>case studies"]
        UC["usePortfolioContent()"]
        TB["PersistentTelebot<br/>one canvas, follows anchors"]
        SC["three/TelebotScene.ts<br/>three/ScreenReel.ts"]
        PG --> UC
        CASE --> UC
        TB --> SC
    end

    subgraph SRV["⚙️  server/ · Nitro"]
        direction TB
        CHAT["api/chat.post.ts"]
        GR["utils/grounding.ts"]
        CHAT --> GR
    end

    J --> V
    V --> UC
    V --> GR
    APP <-->|"SSE stream"| CHAT
    CHAT -.->|"optional selector"| LLM["Anthropic API"]
    APP --> HOST[("☁️ Vercel / Docker")]
    SRV --> HOST

    classDef c fill:#06170f,stroke:#39ff88,color:#eafff3
    classDef a fill:#0b3d2a,stroke:#39ff88,color:#eafff3
    classDef s fill:#102a20,stroke:#8affbf,color:#eafff3
    classDef o fill:#1c1c1c,stroke:#888,color:#eafff3
    class J,V c
    class PG,CASE,UC,TB,SC a
    class CHAT,GR s
    class LLM,HOST o
```

### 2 · Ask MEG: grounded answer flow

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor / Recruiter
    participant W as Browser (Ask MEG)
    participant API as /api/chat
    participant L as Anthropic selector (optional)
    participant G as Grounding + content

    V->>W: type a brief
    W->>API: POST bounded brief
    API->>API: validate input + rate-limit (hashed address key)
    alt key configured
        API->>L: pick tool / topic
        L-->>API: selection only
    else no key or provider error
        API->>API: deterministic offline selection
    end
    API->>G: build answer from validated content
    G-->>API: text + sources
    API-->>W: SSE: meta → tool → token… → sources → done
    W->>W: re-check tool allowlist, drive MEG's screen
    W-->>V: streamed answer with citations
```

> The model never writes portfolio facts or citations. Tool names and arguments are allowlisted on the server **and** again in the browser.

### 3 · MEG's life cycle

```mermaid
flowchart LR
    A["Hero anchor visible"] --> B["MEG docks to hero"]
    C["Ask anchor visible"] --> D["MEG docks to Ask chapter"]
    E["Neither visible"] --> F["Compact corner assistant"]
    B & D & F --> G{"Off-screen, tab hidden,<br/>or slow frames?"}
    G -->|"yes"| H["Pause · drop to low quality<br/>dispose GPU resources"]
    G -->|"no"| I["Render CRT: scanlines · shockwave<br/>terminal stream · project preview"]

    classDef a fill:#0b3d2a,stroke:#39ff88,color:#eafff3
    classDef b fill:#06170f,stroke:#8affbf,color:#eafff3
    class A,C,E,B,D,F a
    class G,H,I b
```

<br/>

## ✦ Run It

> **Needs:** Node `20.19.5` (pinned in `.nvmrc`) and npm 10+.

```bash
npm ci
npm run dev          # http://localhost:3000
```

```bash
npm run typecheck
npm run test
npm run preview
make test            # offline verification: typecheck + production build, no API key needed
```

**Docker**

```bash
docker build -t shivang-portfolio .
docker run --rm -p 3000:3000 shivang-portfolio
```

<br/>

## ✦ Editing Content

Edit JSON only. Every file is validated on the server and at the client boundary.

| File | Owns |
|---|---|
| `content/bio.json` | Name, role, tagline, pitch, origin lines, timeline, research focus |
| `content/capabilities.json` | Numbered capabilities and the builds that prove each one |
| `content/startups.json` | Venture case files (real ventures only) |
| `content/projects.json` | `PRJCT/NN` records, decisions, outcomes, links, media |
| `content/research.json` | Published writing, kept separate from focus areas |
| `content/impact.json` | Owner-reported impact rows and source state |
| `content/testimonials.json` | Real quotes and the honesty note |
| `content/awards.json` · `press.json` · `talks.json` | Recognition and appearances |
| `content/music.json` | Discography and the public SoundCloud link |
| `content/contact.json` | Email, timezone, availability, social links |
| `content/media.json` | Confirmed photos and videos for the CRT reel |

> ⚠️ **Honesty rule:** a fact without an owner-confirmed source stays `[PLACEHOLDER]` or `owner-reported-awaiting-source`. Never put secrets, analytics exports or API keys in these files.

<br/>

## ✦ MEG

One canvas, procedurally built in Three.js, no model files.

- **Anchors:** follows `[data-telebot-anchor="hero"]` and `"ask"`, then shrinks to a corner assistant
- **Screen:** `ScreenReel.ts` runs the CRT channels, typed boot, terminal stream, scanlines, vignette, pointer ripple and project preview
- **Performance:** lazy-loaded, pauses off-screen and when the tab is hidden, disposes geometries, materials and textures, drops quality after slow frames
- **Accessibility:** honors reduced motion, and the Capabilities chapter falls back to a static grid
- **Contract:** `useTelebot()` exposes `setChannel`, `setMood`, `streamText`, `playMedia`, `setProjectPreview`, `dance`

<br/>

## ✦ Environment

Copy `.env.example` to `.env`, or set these in Vercel. Never commit `.env`.

| Variable | Scope | Purpose |
|---|---|---|
| `NUXT_ANT_THROPIC_KEY` | server-only | Optional Anthropic key, never sent to the browser |
| `NUXT_ANTHROPIC_MODEL` | server-only | Optional model name your account can use |
| `NUXT_PUBLIC_SITE_URL` | public | Final HTTPS origin for the sitemap and Person JSON-LD |

<br/>

## ✦ Deploy

1. Import this folder into Vercel as a Nuxt project
2. Set `NUXT_PUBLIC_SITE_URL` to the final HTTPS URL
3. Set `NUXT_ANT_THROPIC_KEY` only if you want live selector routing
4. Build with the default `npm run build`
5. Verify `/`, `/projects/holopad`, `/sitemap.xml`, `/robots.txt` and `/api/chat`

<br/>

## ✦ Project Map

```
app/pages/index.vue                 story order
app/pages/projects/[id].vue         deep-linkable case studies
app/components/PersistentTelebot    one-canvas placement shell
app/three/TelebotScene.ts           procedural 3D rig
app/three/ScreenReel.ts             shader + CRT screen module
content/                            editable canonical facts
shared/                             validation and SSE contracts
server/api/chat.post.ts             grounded AI boundary
server/utils/grounding.ts           deterministic answer + tool selection
tests/ · scripts/ · types/          checks, tooling, shared types
```

<br/>

<div align="center">

Built by **[Shivang](https://github.com/shiv0xparanoid)**

<sub>MIT licensed · say hi to MEG on the live site 📺</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:39ff88,50:0b3d2a,100:020a06&height=120&section=footer" width="100%" />

</div>
