interface SiteConfig {
  domain: string
  siteName: string
  canonicalBase: string
  githubRepo: string
  githubBranch: string
}

const SITE_CONFIGS = {
  church: {
    domain: 'church.ofgod.info',
    siteName: 'Church of God',
    canonicalBase: 'https://church.ofgod.info',
    githubRepo: 'life-and-dev/church',
    githubBranch: 'main'
  },
  kingdom: {
    domain: 'kingdom.ofgod.info',
    siteName: 'Kingdom of God',
    canonicalBase: 'https://kingdom.ofgod.info',
    githubRepo: 'life-and-dev/kingdom',
    githubBranch: 'main'
  },
  ofgod: {
    domain: 'ofgod.info',
    siteName: 'Of God',
    canonicalBase: 'https://ofgod.info',
    githubRepo: 'life-and-dev/ofgod',
    githubBranch: 'main'
  },
  son: {
    domain: 'son.ofgod.info',
    siteName: 'Son of God',
    canonicalBase: 'https://son.ofgod.info',
    githubRepo: 'life-and-dev/son',
    githubBranch: 'main'
  },
  word: {
    domain: 'word.ofgod.info',
    siteName: 'Word of God',
    canonicalBase: 'https://word.ofgod.info',
    githubRepo: 'life-and-dev/word',
    githubBranch: 'main'
  },
} as const

export type ContentDomain = keyof typeof SITE_CONFIGS

/**
 * Get site configuration based on CONTENT env var
 */
export function useSiteConfig(): SiteConfig {
  const config = useRuntimeConfig()
  const contentDomain = (config.public.contentDomain) as ContentDomain

  return SITE_CONFIGS[contentDomain]
}
