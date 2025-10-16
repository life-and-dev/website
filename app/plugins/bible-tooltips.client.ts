// Custom Bible Verse Tooltip Plugin using Bible-API.com
import { processBibleVerseText, createBibleHubInterlinearUrl, parseReference, type ProcessedBibleVerse } from '~/utils/bible-verse-utils'
import { createBibleReferencePatterns } from '~/utils/bible-book-names'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.server) return

  class BibleTooltips {
    private cache = new Map<string, ProcessedBibleVerse>()
    private tooltip: HTMLElement | null = null
    private overlay: HTMLElement | null = null
    private currentLockState = false
    private currentCloseTimeout: NodeJS.Timeout | null = null
    private onHideCallback: (() => void) | null = null
    private currentElement: HTMLElement | null = null // Track which element currently owns the tooltip

    constructor() {
      // Create overlay immediately on construction
      this.overlay = this.createOverlay()
      this.setupOverlayHandlers()
      this.initializeTooltips()
    }

    private setupOverlayHandlers() {
      if (!this.overlay) return

      // Add touchstart handler in CAPTURE phase to catch events early
      this.overlay.addEventListener('touchstart', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.hideTooltip()
      }, { capture: true })

      // Add touchend handler in CAPTURE phase
      this.overlay.addEventListener('touchend', (e) => {
        e.preventDefault()
        e.stopPropagation()
      }, { capture: true })

      // Add click handler for desktop
      this.overlay.addEventListener('click', (e) => {
        e.stopPropagation()
        this.hideTooltip()
      }, { capture: true })
    }

    private async fetchVerse(fullReference: string): Promise<ProcessedBibleVerse> {
      if (this.cache.has(fullReference)) {
        return this.cache.get(fullReference)!
      }

      // Parse reference to extract translation (defaults to ESV)
      const { reference, translation } = parseReference(fullReference)

      try {
        // Using bible-api.com which supports CORS and is free
        // Format: https://bible-api.com/John+3:16?translation=esv
        const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation.toLowerCase()}`
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`)
        }

        const data = await response.json()
        const result = processBibleVerseText(data, reference)

        if (!result.text) {
          return {
            text: 'Click the links below to read this verse:',
            translation: translation
          }
        }

        // Override translation with the requested one
        result.translation = translation

        this.cache.set(fullReference, result)
        return result
      } catch (error) {
        console.warn('Bible API unavailable:', error)
        // Return friendly message with working links
        return {
          text: 'Click the links below to read this verse:',
          translation: translation
        }
      }
    }

    private createOverlay(): HTMLElement {
      const overlay = document.createElement('div')
      overlay.className = 'bible-tooltip-overlay'
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: none;
        background: transparent;
        pointer-events: auto;
        touch-action: none;
      `
      document.body.appendChild(overlay)
      return overlay
    }

    private createTooltip(): HTMLElement {
      const tooltip = document.createElement('div')
      tooltip.className = 'bible-tooltip'

      // Get computed theme colors from document root
      const computedStyle = getComputedStyle(document.documentElement)
      const appBarBgColor = computedStyle.getPropertyValue('--v-theme-surface-appbar') || '228, 234, 240'
      const contentTextColor = computedStyle.getPropertyValue('--v-theme-on-surface') || '36, 41, 47'

      tooltip.style.cssText = `
        position: fixed;
        background: rgb(${appBarBgColor});
        color: rgb(${contentTextColor});
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.4;
        max-width: 25rem;
        z-index: 10000;
        box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.3);
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `
      document.body.appendChild(tooltip)
      return tooltip
    }

    private showTooltip(element: HTMLElement, verseData: ProcessedBibleVerse, event: MouseEvent) {
      if (!this.tooltip) {
        this.tooltip = this.createTooltip()

        // Prevent tooltip from closing when mouse is over it
        this.tooltip.addEventListener('mouseenter', () => {
          // Cancel any pending hide
          if (this.currentCloseTimeout) {
            clearTimeout(this.currentCloseTimeout)
            this.currentCloseTimeout = null
          }
        })

        this.tooltip.addEventListener('mouseleave', () => {
          // Only hide if not locked, with small delay to allow moving to next verse
          if (!this.currentLockState) {
            this.currentCloseTimeout = setTimeout(() => {
              if (!this.currentLockState) {
                this.hideTooltip()
              }
            }, 100)
          }
        })
      }

      // Get full reference from data-reference attribute (handles shorthand expansion)
      const reference = (element as HTMLElement).getAttribute('data-reference') || element.textContent || ''
      const bibleGatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=ESV`
      const bibleHubUrl = createBibleHubInterlinearUrl(reference)

      // Get link color from CSS variables
      const computedStyle = getComputedStyle(document.documentElement)
      const linkColor = computedStyle.getPropertyValue('--v-theme-primary') || '9, 105, 218'
      const outlineColor = computedStyle.getPropertyValue('--v-theme-outline') || '208, 215, 222'
      const secondaryColor = computedStyle.getPropertyValue('--v-theme-secondary') || '101, 109, 118'

      // Build title with translation
      const title = verseData.translation
        ? `${reference} <span style="color: rgb(${secondaryColor}); font-weight: 500;">(${verseData.translation})</span>`
        : reference

      this.tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 0.25rem;">${title}</div>
        <div style="line-height: 1.5; margin-bottom: 0.75rem;">${verseData.text}</div>
        <div style="border-top: 1px solid rgb(${outlineColor}); padding-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.75rem;">
          <a href="${bibleGatewayUrl}" target="_blank" rel="noopener noreferrer" style="color: rgb(${linkColor}); text-decoration: none; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 0.25rem;">
            <svg style="width: 0.875rem; height: 0.875rem; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
            </svg>
            Read Full Context
          </a>
          <a href="${bibleHubUrl}" target="_blank" rel="noopener noreferrer" style="color: rgb(${linkColor}); text-decoration: none; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 0.25rem;">
            <svg style="width: 0.875rem; height: 0.875rem; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z" />
            </svg>
            Interlinear
          </a>
        </div>
      `

      this.tooltip.style.display = 'block'

      // Position tooltip
      const rect = element.getBoundingClientRect()
      let left = event.clientX
      let top = rect.top - this.tooltip.offsetHeight - 10

      // Adjust if tooltip goes off screen
      if (left + this.tooltip.offsetWidth > window.innerWidth) {
        left = window.innerWidth - this.tooltip.offsetWidth - 10
      }
      if (top < 10) {
        top = rect.bottom + 10
      }

      this.tooltip.style.left = left + 'px'
      this.tooltip.style.top = top + 'px'
    }

    private hideTooltip() {
      if (this.tooltip) {
        this.tooltip.style.display = 'none'
      }
      if (this.overlay) {
        this.overlay.style.display = 'none'
      }
      this.currentLockState = false
      this.currentElement = null // Clear current element owner
      if (this.currentCloseTimeout) {
        clearTimeout(this.currentCloseTimeout)
        this.currentCloseTimeout = null
      }

      // Notify element that tooltip is hidden
      if (this.onHideCallback) {
        this.onHideCallback()
        this.onHideCallback = null
      }
    }

    private async handleMouseEnter(element: HTMLElement, reference: string, event: MouseEvent) {
      // Show loading tooltip immediately
      this.showTooltip(element, { text: 'Loading...', translation: '' }, event)

      // Fetch verse
      const verseData = await this.fetchVerse(reference)

      // Only show if tooltip is still visible (not dismissed while fetching)
      if (this.tooltip && this.tooltip.style.display === 'block') {
        this.showTooltip(element, verseData, event)
      }
    }

    private detectBibleReferences(container: HTMLElement = document.body) {
      const patterns = createBibleReferencePatterns()

      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement
            if (!parent) return NodeFilter.FILTER_REJECT

            // Skip if already processed or in excluded elements
            if (parent.classList.contains('bible-tooltip') ||
                parent.classList.contains('no-bible') ||
                parent.tagName === 'SCRIPT' ||
                parent.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT
            }

            return NodeFilter.FILTER_ACCEPT
          }
        }
      )

      const textNodes: Text[] = []
      let node: Node | null
      while (node = walker.nextNode()) {
        textNodes.push(node as Text)
      }

      textNodes.forEach(textNode => {
        const text = textNode.textContent || ''
        let hasMatches = false
        const matches: Array<{index: number, length: number, text: string}> = []

        // Collect all matches from all patterns
        patterns.forEach(pattern => {
          let match
          while ((match = pattern.exec(text)) !== null) {
            const matchStart = match.index
            const matchEnd = matchStart + match[0].length

            // Check if this match overlaps with any existing match
            const overlaps = matches.some(m =>
              (matchStart >= m.index && matchStart < m.index + m.length) ||
              (matchEnd > m.index && matchEnd <= m.index + m.length) ||
              (matchStart <= m.index && matchEnd >= m.index + m.length)
            )

            if (!overlaps) {
              matches.push({
                index: matchStart,
                length: match[0].length,
                text: match[0]
              })
              hasMatches = true
            }
          }
          pattern.lastIndex = 0 // Reset regex
        })

        // Sort matches by index
        matches.sort((a, b) => a.index - b.index)

        // Expand shorthand notation (e.g., "John 14:16,26" or "Revelation 1:5, 17:14")
        const expanded: Array<{index: number, length: number, text: string, displayText: string}> = []

        const addExpanded = (index: number, length: number, text: string, displayText: string) => {
          expanded.push({ index, length, text, displayText })
        }

        matches.forEach(match => {
          // Check if followed by comma-separated shorthand (e.g., ",26" or ", 17:14")
          const afterMatch = text.substring(match.index + match.length)
          const shorthandPattern = /^(?:,\s*(\d+(?::\d+)?(?:-\d+(?::\d+)?)?))*/
          const shorthandMatch = afterMatch.match(shorthandPattern)

          if (shorthandMatch && shorthandMatch[0].length > 0) {
            // Extract book name and chapter from the original match
            const refMatch = match.text.match(/^(.+?)\s+(\d+):(\d+)/)
            if (refMatch) {
              const [, book, chapter] = refMatch

              // Add the original match
              addExpanded(match.index, match.length, match.text, match.text)

              // Parse shorthand references
              const shorthands = shorthandMatch[0].split(',').filter(s => s.trim())
              let currentIndex = match.index + match.length

              shorthands.forEach(shorthand => {
                const trimmed = shorthand.trim()
                if (trimmed) {
                  const expandedRef = trimmed.includes(':')
                    ? `${book} ${trimmed}`           // Chapter:verse format (e.g., "17:14")
                    : `${book} ${chapter}:${trimmed}` // Just verse number (e.g., "26")

                  const shorthandIndex = text.indexOf(shorthand, currentIndex)
                  if (shorthandIndex !== -1) {
                    addExpanded(shorthandIndex, shorthand.length, expandedRef, trimmed)
                    currentIndex = shorthandIndex + shorthand.length
                  }
                }
              })
              return
            }
          }

          // No shorthand or not a chapter:verse pattern - add original
          addExpanded(match.index, match.length, match.text, match.text)
        })

        // Replace matches by creating nodes manually (more reliable than innerHTML)
        if (hasMatches && textNode.parentElement && textNode.parentNode) {
          // Sort matches by index (forward order for sequential processing)
          expanded.sort((a, b) => a.index - b.index)

          let lastIndex = 0
          const fragment = document.createDocumentFragment()

          expanded.forEach(match => {
            // Add text before the match
            if (match.index > lastIndex) {
              const beforeText = text.substring(lastIndex, match.index)
              fragment.appendChild(document.createTextNode(beforeText))
            }

            // Create the span element
            const span = document.createElement('span')
            span.className = 'bible-ref'
            span.setAttribute('data-reference', match.text)
            span.style.cssText = 'color: rgb(var(--v-theme-primary)); text-decoration: underline; cursor: help;'
            span.textContent = match.displayText
            fragment.appendChild(span)

            lastIndex = match.index + match.length
          })

          // Add remaining text after last match
          if (lastIndex < text.length) {
            const afterText = text.substring(lastIndex)
            fragment.appendChild(document.createTextNode(afterText))
          }

          // Replace the original text node with the fragment
          textNode.parentNode.insertBefore(fragment, textNode)
          textNode.remove()
        }
      })

      // Add event listeners to new bible references
      container.querySelectorAll('.bible-ref').forEach(element => {
        if (element.hasAttribute('data-bible-processed')) return
        element.setAttribute('data-bible-processed', 'true')

        const reference = element.getAttribute('data-reference')
        if (!reference) return

        let isTooltipVisible = false

        // Mouse events for desktop
        element.addEventListener('mouseenter', (e) => {
          if (!isTooltipVisible) {
            // If another element currently owns the tooltip, reset its state
            if (this.currentElement && this.currentElement !== element && this.onHideCallback) {
              this.onHideCallback()
              this.onHideCallback = null
            }

            // Clear any pending close timeout from OTHER verses
            if (this.currentCloseTimeout) {
              clearTimeout(this.currentCloseTimeout)
              this.currentCloseTimeout = null
            }

            this.handleMouseEnter(element as HTMLElement, reference, e as MouseEvent)
            isTooltipVisible = true
            this.currentElement = element as HTMLElement // Track this element as owner

            // Register callback to reset visible state when hidden
            this.onHideCallback = () => {
              isTooltipVisible = false
            }
          }
        })

        element.addEventListener('mouseleave', () => {
          // Only auto-close if THIS element owns the tooltip and not locked
          if (!this.currentLockState && this.currentElement === element) {
            this.currentCloseTimeout = setTimeout(() => {
              // Double-check this element still owns the tooltip
              if (!this.currentLockState && this.currentElement === element) {
                this.hideTooltip()
                isTooltipVisible = false
              }
            }, 300)
          }
        })

        // Click event to lock tooltip
        element.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()

          // Clear any pending close timeout
          if (this.currentCloseTimeout) {
            clearTimeout(this.currentCloseTimeout)
            this.currentCloseTimeout = null
          }

          // Lock the tooltip and show overlay
          this.currentLockState = true
          if (this.overlay) {
            this.overlay.style.display = 'block'
          }

          if (!isTooltipVisible) {
            this.handleMouseEnter(element as HTMLElement, reference, e as MouseEvent)
            isTooltipVisible = true
          }
        })

        // Touch events for mobile
        element.addEventListener('touchstart', (e: Event) => {
          const touchEvent = e as TouchEvent
          touchEvent.preventDefault() // Prevent mouse events from firing

          // Clear any pending close timeout
          if (this.currentCloseTimeout) {
            clearTimeout(this.currentCloseTimeout)
            this.currentCloseTimeout = null
          }

          // Lock the tooltip and show overlay
          this.currentLockState = true
          if (this.overlay) {
            this.overlay.style.display = 'block'
          }

          if (touchEvent.touches.length > 0) {
            const touch = touchEvent.touches[0]
            if (touch) {
              const syntheticEvent = new MouseEvent('mouseenter', {
                clientX: touch.clientX,
                clientY: touch.clientY
              })
              this.handleMouseEnter(element as HTMLElement, reference, syntheticEvent)
              isTooltipVisible = true
            }
          }
        })

        // Global click handler to close locked tooltip when clicking outside
        const closeOnOutsideClick = (e: MouseEvent) => {
          if (this.currentLockState && isTooltipVisible && this.tooltip && !this.tooltip.contains(e.target as Node) && !element.contains(e.target as Node)) {
            this.hideTooltip()
            isTooltipVisible = false
          }
        }
        document.addEventListener('click', closeOnOutsideClick)
      })
    }

    public scan() {
      this.detectBibleReferences()
    }

    private initializeTooltips() {
      // No initial scan - pages will trigger manually after ContentRenderer completes
      // This prevents unnecessary duplicate scans
    }
  }

  // Create global instance
  const bibleTooltips = new BibleTooltips()

  // Provide scan function for manual triggering after ContentRenderer completes
  nuxtApp.provide('bibleTooltips', {
    scan: () => bibleTooltips.scan()
  })
})

// TypeScript declarations
declare module '#app' {
  interface NuxtApp {
    $bibleTooltips: {
      scan: () => void
    }
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $bibleTooltips: {
      scan: () => void
    }
  }
}