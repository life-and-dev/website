// https://nuxt.com/docs/api/configuration/nuxt-config
import { getDomainThemes } from './app/config/themes'

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
    typeCheck: true
  },

  nitro: {
    preset: 'cloudflare-pages-static',
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      failOnError: false
    },
    cloudflare: {
      pages: {
        routes: {
          // Empty include = no Functions, purely static
          // This prevents /* /404.html 404 redirect
          include: [],
          exclude: []
        }
      }
    }
  },

  ssr: true,

  css: [
    '~/assets/css/markdown.css',
    '~/assets/css/print.css'
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
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  hooks: {
    // Start image watcher when dev server starts
    'ready': async (nuxt) => {
      if (nuxt.options.dev) {
        const { watchImages } = await import('./scripts/watch-images')
        await watchImages()
      }
    },

    // Generate and copy favicons before build
    'build:before': async () => {
      const domain = process.env.CONTENT || 'ofgod'
      const { generateFavicons, copyFaviconsToPublic, generateWebManifest } = await import('./scripts/generate-favicons')

      // Domain name mapping
      const domainNames: Record<string, string> = {
        ofgod: 'Our Father God',
        kingdom: 'The Kingdom of God',
        son: 'The Son of God',
        church: 'The Church of God',
        word: 'The Word of God'
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
        VContainer: {
          // class: 'pa-6',
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
