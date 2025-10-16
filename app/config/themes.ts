import type { ThemeDefinition } from 'vuetify'

export type ContentDomain = 'ofgod' | 'church' | 'kingdom' | 'son' | 'word'

/**
 * GitHub Blue
 */
function createOFGodThemes(): Record<string, ThemeDefinition> {
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
 * Purple
 */
function createChurchThemes(): Record<string, ThemeDefinition> {
  return {
    light: {
      dark: false,
      colors: {
        primary: '#602080',
        secondary: '#ffffff',
        selectable: '#602080',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
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
        primary: '#8f5faf',
        secondary: '#2b302d',
        selectable: '#8f5faf',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
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
 * Green
 */
function createKingdomThemes(): Record<string, ThemeDefinition> {
  return {
    light: {
      dark: false,
      colors: {
        primary: '#208060',
        secondary: '#ffffff',
        selectable: '#208060',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#f5f9f9',
        surface: '#ffffff',
        'surface-rail': '#edf5f5',
        'surface-appbar': '#e4f0f0',
        'on-surface-rail': '#2a3030',
        'on-surface-appbar': '#000000',
        'on-background': '#242929',
        'on-surface': '#242929',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-selectable': '#242929',
        'on-selected': '#000000',
        'on-error': '#ffffff',
        'on-warning': '#000000',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#d0d7d7',
        'outline-bars': '#f3f4f4'
      }
    },
    dark: {
      dark: true,
      colors: {
        primary: '#5faf8f',
        secondary: '#2d302b',
        selectable: '#5faf8f',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#161b1b',
        surface: '#0d1111',
        'surface-rail': '#1f2525',
        'surface-appbar': '#282f2f',
        'on-surface-rail': '#ced0d0',
        'on-surface-appbar': '#ffffff',
        'on-background': '#d1c9c9',
        'on-surface': '#d1c9c9',
        'on-primary': '#110d0d',
        'on-secondary': '#110d0d',
        'on-selectable': '#d1c9c9',
        'on-selected': '#ffffff',
        'on-error': '#ffffff',
        'on-warning': '#ffffff',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#363030',
        'outline-bars': '#1b1616'
      }
    }
  }
}

/**
 * Red
 */
function createSonThemes(): Record<string, ThemeDefinition> {
  return {
    light: {
      dark: false,
      colors: {
        primary: '#802020',
        secondary: '#ffffff',
        selectable: '#802020',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#f9f9f9',
        surface: '#ffffff',
        'surface-rail': '#f5f5f5',
        'surface-appbar': '#f0f0f0',
        'on-surface-rail': '#2a2a2a',
        'on-surface-appbar': '#000000',
        'on-background': '#292929',
        'on-surface': '#292929',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-selectable': '#292929',
        'on-selected': '#000000',
        'on-error': '#ffffff',
        'on-warning': '#000000',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#d7d7d7',
        'outline-bars': '#f4f4f4'
      }
    },
    dark: {
      dark: true,
      colors: {
        primary: '#af5f5f',
        secondary: '#302d2b',
        selectable: '#af5f5f',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#161616',
        surface: '#0d0d0d',
        'surface-rail': '#252525',
        'surface-appbar': '#282828',
        'on-surface-rail': '#d0d0d0',
        'on-surface-appbar': '#ffffff',
        'on-background': '#d1d1d1',
        'on-surface': '#d1d1d1',
        'on-primary': '#111111',
        'on-secondary': '#111111',
        'on-selectable': '#d1d1d1',
        'on-selected': '#ffffff',
        'on-error': '#ffffff',
        'on-warning': '#ffffff',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#303030',
        'outline-bars': '#161616'
      }
    }
  }
}

/**
 * Gold
 */
function createWordThemes(): Record<string, ThemeDefinition> {
  return {
    light: {
      dark: false,
      colors: {
        primary: '#806020',
        secondary: '#ffffff',
        selectable: '#806020',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#f9f9f9',
        surface: '#ffffff',
        'surface-rail': '#f5f5f5',
        'surface-appbar': '#f0f0f0',
        'on-surface-rail': '#2a2a2a',
        'on-surface-appbar': '#000000',
        'on-background': '#292929',
        'on-surface': '#292929',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-selectable': '#292929',
        'on-selected': '#000000',
        'on-error': '#ffffff',
        'on-warning': '#000000',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#d7d7d7',
        'outline-bars': '#f4f4f4'
      }
    },
    dark: {
      dark: true,
      colors: {
        primary: '#af8f5f',
        secondary: '#302d2b',
        selectable: '#af8f5f',
        error: '#d64d5b',
        warning: '#c29e4a',
        info: '#548af7',
        success: '#6aab73',
        background: '#161616',
        surface: '#0d0d0d',
        'surface-rail': '#252525',
        'surface-appbar': '#282828',
        'on-surface-rail': '#d0d0d0',
        'on-surface-appbar': '#ffffff',
        'on-background': '#d1d1d1',
        'on-surface': '#d1d1d1',
        'on-primary': '#111111',
        'on-secondary': '#111111',
        'on-selectable': '#d1d1d1',
        'on-selected': '#ffffff',
        'on-error': '#ffffff',
        'on-warning': '#ffffff',
        'on-info': '#ffffff',
        'on-success': '#ffffff',
        outline: '#303030',
        'outline-bars': '#161616'
      }
    }
  }
}

/**
 * Domain-specific theme configurations
 * All domains use GitHub colors initially - customize colors here later
 */
const DOMAIN_THEMES: Record<ContentDomain, Record<string, ThemeDefinition>> = {
  ofgod: createOFGodThemes(),
  church: createChurchThemes(),
  kingdom: createKingdomThemes(),
  son: createSonThemes(),
  word: createWordThemes(),
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
