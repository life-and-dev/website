// https://nuxt.com/docs/api/configuration/nuxt-config
import { getDomainThemes } from './app/config/themes'
import { createBibleReferencePatterns } from './app/utils/bible-book-names'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      contentDomain: process.env.CONTENT
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  nitro: {
    preset: 'static'  // Pure static preset - no SPA fallbacks
  },

  ssr: true,

  css: [
    '~/assets/css/markdown.css',
    '~/assets/css/print.css',
    '~/assets/css/bible-tooltips.css'
  ],

  modules: [
    'vuetify-nuxt-module',
    '@nuxt/content'
  ],

  vite: {
    build: {
      rollupOptions: {
        external: ['fs/promises', 'path']
      }
    }
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg', sizes: 'any' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap' }
      ]
    }
  },

  hooks: {
    // Wrap Bible verses in spans BEFORE markdown is parsed to AST
    // This prevents hydration mismatch by ensuring server and client HTML match
    'content:file:beforeParse': (ctx) => {
      const { file } = ctx
      if (!file.id.endsWith('.md')) return

      console.log('📖 Processing Bible verses in:', file.id)

      const patterns = createBibleReferencePatterns()
      const excludedContexts = ['```', '~~~', '<code', '<pre', '<a ']

      // Check if we're inside excluded context
      const isInExcludedContext = (text: string, index: number): boolean => {
        const before = text.substring(0, index)

        // Check for code blocks
        const codeBlockCount = (before.match(/```/g) || []).length
        if (codeBlockCount % 2 === 1) return true

        // Check for links - rough check for [text](url) format
        const lastOpenBracket = before.lastIndexOf('[')
        const lastCloseBracket = before.lastIndexOf(']')
        if (lastOpenBracket > lastCloseBracket) return true

        return false
      }

      // Process each pattern
      patterns.forEach(pattern => {
        const matches: Array<{ index: number; text: string }> = []

        let match
        while ((match = pattern.exec(file.body)) !== null) {
          if (!isInExcludedContext(file.body, match.index)) {
            matches.push({
              index: match.index,
              text: match[0]
            })
          }
        }
        pattern.lastIndex = 0

        // Replace matches in reverse order to preserve indices
        matches.reverse().forEach(({ index, text }) => {
          const before = file.body.substring(0, index)
          const after = file.body.substring(index + text.length)
          const wrapped = `<span class="bible-ref" data-reference="${text}">${text}</span>`
          file.body = before + wrapped + after
        })
      })
    },

    // Start content watcher when dev server starts
    'ready': async (nuxt) => {
      if (nuxt.options.dev) {
        const { watchImages } = await import('./scripts/watch-images')
        await watchImages()
      }
    },

    // Generate navigation, search index, and favicons before build
    'build:before': async () => {
      const domain: string = process.env.CONTENT || ''

      // Generate navigation and search JSON files
      console.log(`\n🔨 Generating navigation and search index...`)
      const { generateNavigationJson } = await import('./scripts/build-navigation')
      const { generateSearchIndexJson } = await import('./scripts/build-search-index')

      await generateNavigationJson()
      await generateSearchIndexJson()

      // Generate favicons
      const { generateFavicons, copyFaviconsToPublic, generateWebManifest } = await import('./scripts/generate-favicons')

      // Domain name mapping
      const domainNames: Record<string, string> = {
        ofgod: 'Our Father God',
        kingdom: 'Kingdom of God',
        prophecies: 'Prophecies of God',
        son: 'Son of God',
        church: 'Church of God',
        word: 'Word of God'
      }

      const name = domainNames[domain] || domain

      console.log(`\n🎨 Generating favicons for build...`)
      const success = await generateFavicons(domain)

      if (success) {
        await copyFaviconsToPublic(domain)
        await generateWebManifest(domain, name)
        console.log(`✅ Favicons ready for ${domain}\n`)
      }
    }
  },

  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light',
        themes: getDomainThemes(process.env.CONTENT)
      },
      // Minimal component defaults - MD3 compliant
      defaults: {
        // Form Controls
        VTextField: {
          rounded: 'pill',
          variant: 'outlined',
          hideDetails: 'auto',
        },
        VTextarea: {
          variant: 'outlined',
          hideDetails: 'auto'
        },
        VSelect: {
          variant: 'outlined',
          hideDetails: 'auto'
        },
        VCheckbox: {
          color: 'primary',
          hideDetails: 'auto'
        },
        VRadioGroup: {
          density: 'compact'
        },

        // Layout Components
        VCard: {
          color: 'surface',
          elevation: 0,
          rounded: 'xl',
          variant: 'flat'
        },
        VCardActions: {
          class: 'justify-end pa-4'
        },

        // Interactive Components
        VBtn: {
          variant: 'flat',
          rounded: 'pill',
          elevation: 0,
          color: 'primary',
          class: 'transition-all'
        },
        'VBtn[color="secondary"]': {
          variant: 'outlined'
        },
        VDataTable: {
          variant: 'outlined',
          itemsPerPage: 25,
          showSelect: false
        },
        VDialog: {
          maxWidth: '600px',
          elevation: 24
        },
        VAlert: {
          variant: 'tonal'
        },

        // Navigation Components
        VTabs: {
          color: 'primary'
        },
        VAppBar: {
          elevation: 1,
          color: 'surface-appbar'
        },
        VNavigationDrawer: {
          elevation: 12,
          color: 'surface-rail',
          style: 'z-index: 1010;'
        },

        // Additional Components
        VChip: {
          variant: 'flat'
        },
        VSwitch: {
          color: 'primary',
          hideDetails: 'auto'
        },
        VListItem: {
          color: 'secondary'
        },
        VMenu: {
          elevation: 8
        }
      }
    }
  }
})
