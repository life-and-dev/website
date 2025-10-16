import type { ThemeDefinition } from 'vuetify'

export type ContentDomain = 'ofgod' | 'church' | 'kingdom' | 'son' | 'word'

/**
 * Helper function to create theme definitions with consistent structure
 * Following DRY principle - single source of truth for GitHub-style colors
 */
function createGitHubThemes(): Record<string, ThemeDefinition> {
  return {
    light: {
      dark: false,
      colors: {
        primary: '#0969da',     // GitHub link
        secondary: '#656d76',   // GitHub gray
        selectable: '#dbe3eb',
        error: '#d1242f',        // GitHub red
        warning: '#bf8700',      // GitHub yellow/orange
        info: '#0969da',         // Info blue
        success: '#1a7f37',      // GitHub green
        background: '#f6f8fa',
        surface: '#ffffff',
        'surface-rail': '#edf1f5',
        'surface-appbar': '#e4eaf0',
        'on-surface-rail': '#32302a',
        'on-surface-appbar': '#000000',
        'on-background': '#24292f',
        'on-surface': '#24292f',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-selectable': '#24292f',
        'on-selected': '#000000',
        'on-error': '#ffffff',
        'on-warning': '#000000',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#d0d7de',
        'outline-bars': '#f3f4f6'
      }
    },
    dark: {
      dark: true,
      colors: {
        primary: '#58a6ff',      // GitHub link,
        secondary: '#8b949e',    // GitHub dark gray
        selectable: '#313943',
        error: '#f85149',        // GitHub dark red
        warning: '#d29922',      // GitHub dark yellow
        info: '#58a6ff',         // Info blue
        success: '#3fb950',      // GitHub dark green
        background: '#161b22',
        surface: '#0d1117',
        'surface-rail': '#1f252d',
        'surface-appbar': '#282f38',
        'on-surface-rail': '#ced0d6',
        'on-surface-appbar': '#ffffff',
        'on-background': '#c9d1d9',
        'on-surface': '#c9d1d9',
        'on-primary': '#0d1117',
        'on-secondary': '#0d1117',
        'on-selectable': '#c9d1d9',
        'on-selected': '#ffffff',
        'on-error': '#ffffff',
        'on-warning': '#ffffff',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#30363d',
        'outline-bars': '#161b22'
      }
    }
  }
}

/**
 * Domain-specific theme configurations
 * All domains use GitHub colors initially - customize colors here later
 */
const DOMAIN_THEMES: Record<ContentDomain, Record<string, ThemeDefinition>> = {
  ofgod: createGitHubThemes(),
  church: createGitHubThemes(),
  kingdom: createGitHubThemes(),
  son: createGitHubThemes(),
  word: createGitHubThemes(),
}

/**
 * Get theme configuration for a specific domain
 * Used at build time via CONTENT environment variable
 */
export function getDomainThemes(domain: string | undefined): Record<string, ThemeDefinition> {
  const contentDomain = (domain || 'ofgod') as ContentDomain

  // Validate domain exists
  if (!(contentDomain in DOMAIN_THEMES)) {
    console.warn(`Unknown domain "${contentDomain}", falling back to "ofgod"`)
    return DOMAIN_THEMES.ofgod
  }

  return DOMAIN_THEMES[contentDomain]
}
