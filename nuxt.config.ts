// nuxt.config.ts — Shivang Sagar Portfolio rebuild
// Single config for SEO, fonts, build optimizations, runtime env keys,
// TypeScript, Vite aliases for three/addons, and Nitro server plugins.

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  typescript: {
    strict: false,
    shim: false,
    typeCheck: false,
    tsConfig: {
      include: ['types/**/*.ts', 'types/**/*.d.ts'],
      compilerOptions: {
        paths: {
          // Default Nuxt alias `~/*` points to `app/*`. We also have shared
          // types in the project root `types/` folder (content.ts), so make
          // sure `~/types/*` resolves to the root-level types folder.
          '~/types/*': ['../types/*']
        }
      }
    }
  },
  css: ['~/assets/css/main.css'],

  // ==========================================================
  // <head>: fonts, SEO, OG, JSON-LD Person, favicon
  // 4 font families per brief: display (Instrument Sans),
  // serif italic (Instrument Serif), mono (JetBrains Mono),
  // TV pixel (VT323). preconnect + display=swap to avoid FOIT.
  // ==========================================================
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Shivang Sagar — Technology, made tangible.',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            "I'm Shivang Sagar. I build AI-powered products, spatial web experiences, and intelligent systems that turn ambitious ideas into interactive realities."
        },
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f5f3ee' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0c0d11' },
        { name: 'author', content: 'Shivang Sagar' },
        { name: 'keywords', content: 'Shivang Sagar, AI Engineer, Creative Technologist, spatial computing, Three.js, RAG, portfolio' },

        // Open Graph — og image at /og.png (placeholder asset; user replaces later)
        { property: 'og:type', content: 'profile' },
        { property: 'og:site_name', content: 'Shivang Sagar — Portfolio' },
        { property: 'og:title', content: 'Shivang Sagar — Technology, made tangible.' },
        {
          property: 'og:description',
          content:
            'AI/ML Engineer + Creative Technologist. Building spatial web, AI-powered products, and intelligent systems that make software feel tangible.'
        },
        { property: 'og:image', content: '/og.svg' },
        { property: 'profile:first_name', content: 'Shivang' },
        { property: 'profile:last_name', content: 'Sagar' },

        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Shivang Sagar — Technology, made tangible.' },
        {
          name: 'twitter:description',
          content:
            'AI/ML Engineer + Creative Technologist building AI products, spatial web, and intelligent systems.'
        },
        { name: 'twitter:image', content: '/og.svg' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico' },
        { rel: 'canonical', href: '/' },

        // --- 4 font families, preconnect + stylesheet ----------------
        { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: 'anonymous' as any },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' as any },
        {
          rel: 'stylesheet',
          href:
            'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&family=VT323&display=swap'
        }
      ],
      script: [
        // JSON-LD Person schema — keeps SEO JSON outside bundle, renders SSR
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Shivang Sagar',
            jobTitle: 'AI/ML Engineer · Creative Technologist · Builder',
            description:
              "I'm Shivang Sagar. I build AI-powered products, spatial web experiences, and intelligent systems that turn ambitious ideas into interactive realities.",
             url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
             // Public profiles remain empty until the owner confirms exact URLs.
             sameAs: [],
            knowsAbout: [
              'Machine Learning',
              'Spatial Computing',
              'Three.js',
              'WebGL',
              'RAG',
              'Creative Technology'
            ]
          })
        }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  // ==========================================================
  // Runtime config — ONLY server-only keys go here.
  // anthropicKey is NEVER exposed to the client.
  // Client-side public keys go inside `public: { … }`.
  // ==========================================================
  runtimeConfig: {
    anthropicKey: process.env.NUXT_ANT_THROPIC_KEY || '',
    anthropicModel: process.env.NUXT_ANTHROPIC_MODEL || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      // MEG config — safe to ship to client
      telebot: {
        defaultChannel: 'idle',
        offlineMessage:
          "MEG's brain is offline right now — showing saved answers. Email me instead."
      }
    }
  },

  // ==========================================================
  // Nitro: websockets disabled (was game-world only), compress
  // public assets, rate-limit storage for /api/chat.
  // ==========================================================
  nitro: {
    experimental: {
      // websocket removed — not needed for REST/SSE AI chat
      wasm: false
    },
    compressPublicAssets: true
  },

  // ==========================================================
  // Vite: deps optimize for lenis/three/gsap + three/addons alias
  // + include .glb/.gltf/.wasm assets
  // ==========================================================
  vite: {
    optimizeDeps: {
      include: ['three', 'gsap', '@studio-freight/lenis']
    },
    worker: { format: 'es' as const },
    assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.wasm', '**/*.ktx2'],
    resolve: {
      alias: {
        'three/addons': 'three/examples/jsm'
      }
    }
  },

  // ==========================================================
  // Nuxt module-like opts: payload extraction for static perf
  // ==========================================================
  experimental: {
    payloadExtraction: true,
    defaults: {
      nuxtLink: {
        activeClass: 'is-active'
      }
    }
  },

  // Expose ~/server, ~/types to auto-import
  imports: {
    dirs: ['types', 'composables']
  }
})
