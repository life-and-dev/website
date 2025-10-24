// Custom Bible Verse Tooltip Plugin using Bolls.life API
import {
  processBollsVerse,
  processBollsVerseRange,
  createBibleHubInterlinearUrl,
  parseReference,
  getBookNumber,
  type ProcessedBibleVerse
} from '~/utils/bible-verse-utils'
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
        // Parse the reference: "John 3:16" or "John 3:16-18"
        const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?/)

        if (!match) {
          throw new Error(`Invalid reference format: ${reference}`)
        }

        const [, bookName, chapter, startVerse, endVerse] = match

        // Type guards: ensure captured groups exist
        if (!bookName || !chapter || !startVerse) {
          throw new Error(`Invalid reference format: ${reference}`)
        }

        // Get book number (1-66)
        const bookNumber = getBookNumber(bookName)
        if (bookNumber === null) {
          throw new Error(`Unknown book: ${bookName}`)
        }

        let result: ProcessedBibleVerse

        if (endVerse) {
          // Verse range: fetch entire chapter and filter
          // Format: https://bolls.life/get-text/ESV/43/3/
          const url = `https://bolls.life/get-text/${translation}/${bookNumber}/${chapter}/`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`)
          }

          const data = await response.json()
          result = processBollsVerseRange(
            data,
            translation,
            parseInt(startVerse),
            parseInt(endVerse)
          )
        } else {
          // Single verse
          // Format: https://bolls.life/get-verse/ESV/43/3/16/
          const url = `https://bolls.life/get-verse/${translation}/${bookNumber}/${chapter}/${startVerse}/`
          const response = await fetch(url)

          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`)
          }

          const data = await response.json()
          result = processBollsVerse(data, translation)
        }

        if (!result.text) {
          return {
            text: 'Click the links below to read this verse:',
            translation: translation
          }
        }

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
      document.body.appendChild(overlay)
      return overlay
    }

    private createTooltip(): HTMLElement {
      const tooltip = document.createElement('div')
      tooltip.className = 'bible-tooltip'
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

      // Build title with translation
      const title = verseData.translation
        ? `${reference} <span class="bible-tooltip-translation">(${verseData.translation})</span>`
        : reference

      this.tooltip.innerHTML = `
        <div class="bible-tooltip-title">${title}</div>
        <div class="bible-tooltip-text">${verseData.text}</div>
        <div class="bible-tooltip-footer">
          <a href="${bibleGatewayUrl}" target="_blank" rel="noopener noreferrer" class="bible-tooltip-link"><span style="font-size: 1.5em">🕮</span><span class="bible-tooltip-link-text">Full Context</span></a>
          <a href="${bibleHubUrl}" target="_blank" rel="noopener noreferrer" class="bible-tooltip-link"><span style="font-size: 1.5em">אΩ</span><span class="bible-tooltip-link-text">Interlinear</span></a>
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
                parent.tagName === 'STYLE' ||
                parent.tagName === 'A') {  // Don't process text inside links
              return NodeFilter.FILTER_REJECT
            }

            // Also check if any ancestor is a link
            let ancestor = parent.parentElement
            while (ancestor) {
              if (ancestor.tagName === 'A') {
                return NodeFilter.FILTER_REJECT
              }
              ancestor = ancestor.parentElement
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

    public scan(container?: HTMLElement) {
      this.detectBibleReferences(container)
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
    scan: (container?: HTMLElement) => bibleTooltips.scan(container)
  })
})

// TypeScript declarations
declare module '#app' {
  interface NuxtApp {
    $bibleTooltips: {
      scan: (container?: HTMLElement) => void
    }
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $bibleTooltips: {
      scan: (container?: HTMLElement) => void
    }
  }
}