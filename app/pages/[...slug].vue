<template>
  <article>
    <div v-if="pending" class="text-center py-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
    <div v-else-if="!page">
      <v-alert type="error">Page not found</v-alert>
    </div>
    <div v-else>
      <div class="content-body">
        <ContentRenderer :value="page" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()

// Query content using Nuxt Content v3 API
const { data: page, pending } = await useAsyncData(
  `content-${route.path}`,
  () => queryCollection('content').path(route.path).first()
)

// 404 handling
if (!page.value && !pending.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

// SEO meta tags
// @nuxt/content v3 automatically extracts title from first H1
const siteConfig = useSiteConfig()
useHead(() => ({
  title: page.value?.title || 'Page',
  htmlAttrs: { lang: 'en' },
  meta: [
    { name: 'description', content: page.value?.description || '' },
    { name: 'keywords', content: page.value?.keywords?.join(', ') || '' },
    { name: 'robots', content: 'index, follow' }
  ],
  link: [
    { rel: 'canonical', href: `${siteConfig.canonicalBase}${route.path}` }
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
