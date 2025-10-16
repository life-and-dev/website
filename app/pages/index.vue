<template>
  <article>
    <div v-if="pending" class="text-center py-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
    <div v-else-if="!page">
      <v-alert type="error">Home page not found</v-alert>
    </div>
    <div v-else>
      <div class="content-body">
        <ContentRenderer :value="page" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
// Query home page content using Nuxt Content v3 API
const { data: page, pending } = await useAsyncData(
  'content-home',
  () => queryCollection('content').path('/').first()
)

// SEO meta tags
const siteConfig = useSiteConfig()
useHead(() => ({
  title: page.value?.title || 'Home',
  htmlAttrs: { lang: 'en' },
  meta: [
    { name: 'description', content: page.value?.description || '' },
    { name: 'keywords', content: page.value?.keywords?.join(', ') || '' },
    { name: 'robots', content: 'index, follow' }
  ],
  link: [
    { rel: 'canonical', href: siteConfig.canonicalBase }
  ]
}))

// Trigger Bible tooltips scan after content renders
const { $bibleTooltips } = useNuxtApp()

onMounted(() => {
  // Initial scan
  if (page.value) {
    nextTick(() => $bibleTooltips.scan())
  }

  // Re-scan when content changes
  watch(() => page.value, (newPage) => {
    if (newPage) {
      nextTick(() => $bibleTooltips.scan())
    }
  })
})
</script>
