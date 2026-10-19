<script setup lang="ts">
/**
 * The home page deliberately keeps the story in the DOM during the loader.
 * That gives crawlers, keyboard users, and reduced-motion visitors the same
 * semantic page; the loader is presentation, not a content gate.
 */
import { onMounted } from 'vue'
import { useTelebot } from '~/composables/useTelebot'

const tb = useTelebot()

useHead({
  title: 'Shivang Sagar — Technology, made tangible.',
  meta: [{ name: 'description', content: 'AI/ML Engineer, Creative Technologist and Builder. AI-powered products, spatial web experiences and intelligent systems.' }]
})

onMounted(() => {
  tb.setChannel('face')
  tb.setMood('idle')
})
</script>

<template>
  <div class="portfolio-home">
    <ClientOnly><LoadingScreen /></ClientOnly>

    <!-- Chapters are SSR-rendered. PersistentTelebot follows the two anchors. -->
    <HeroSection :auto-start="true" />
    <OriginSection />
    <ProjectsSection />
    <StartupsSection />
    <CapabilitiesSection />
    <ResearchSection />
    <ImpactSection />
    <PeopleSection />
    <AskTelebot />
    <!-- Keep the full-viewport Let's connect hero after MEG, never beside or over Impact. -->
    <ContactSection />
    <ExtrasSection />
  </div>
</template>
