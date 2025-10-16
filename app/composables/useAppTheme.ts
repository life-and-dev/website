import { useTheme as useVuetifyTheme } from 'vuetify'

export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme-preference'

export const useAppTheme = () => {
  const vuetifyTheme = useVuetifyTheme()

  // Get the current theme preference from localStorage or default to 'light'
  const getStoredTheme = (): ThemeMode => {
    if (import.meta.client) {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode
      return stored && ['light', 'dark'].includes(stored) ? stored : 'light'
    }
    return 'light'
  }

  // Store theme preference in localStorage
  const setStoredTheme = (theme: ThemeMode) => {
    if (import.meta.client) {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  }

  // Reactive theme preference
  const themePreference = ref<ThemeMode>(getStoredTheme())

  // Apply theme to Vuetify
  const applyTheme = (theme: ThemeMode) => {
    // Use the new Vuetify 3.7+ API: theme.change()
    if (vuetifyTheme && typeof (vuetifyTheme as any).change === 'function') {
      (vuetifyTheme as any).change(theme)
    } else if (vuetifyTheme.global) {
      // Fallback for older versions
      vuetifyTheme.global.name.value = theme
    }
  }

  // Set theme preference and apply it
  const setTheme = (theme: ThemeMode) => {
    themePreference.value = theme
    setStoredTheme(theme)
    applyTheme(theme)
  }

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme: ThemeMode = themePreference.value === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  // Initialize theme on mount
  onMounted(() => {
    const storedTheme = getStoredTheme()
    themePreference.value = storedTheme
    applyTheme(storedTheme)
  })

  return {
    themePreference: readonly(themePreference),
    setTheme,
    toggleTheme,
  }
}
