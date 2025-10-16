/**
 * Shared utility functions for Bible verse handling
 */

interface BibleApiResponse {
  verses?: Array<{ text: string }>
  text?: string
  translation_id?: string
  translation_name?: string
}

export interface ProcessedBibleVerse {
  text: string
  translation: string
}

export interface ParsedReference {
  reference: string  // Reference without translation (e.g., "John 3:16")
  translation: string  // Translation code (e.g., "ESV", defaults to "ESV")
}

/**
 * Parse a Bible reference and extract translation
 * @param fullReference - Full reference with optional translation (e.g., "John 3:16 (KJV)" or "John 3:16")
 * @returns Parsed reference object with reference and translation
 */
export function parseReference(fullReference: string): ParsedReference {
  // Match translation in parentheses at the end: (ESV), (KJV), etc.
  const match = fullReference.match(/^(.+?)\s*\(([A-Z]+)\)\s*$/)

  if (match && match[1] && match[2]) {
    return {
      reference: match[1].trim(),
      translation: match[2]
    }
  }

  // No translation specified, default to ESV
  return {
    reference: fullReference.trim(),
    translation: 'ESV'
  }
}

const MAX_VERSES = 4

/**
 * Process Bible API response and truncate to first 4 verses if needed
 * @param data - Response from bible-api.com
 * @param _reference - Optional reference string (reserved for future use)
 * @returns Processed verse text with translation and ellipsis if truncated
 */
export function processBibleVerseText(data: BibleApiResponse, _reference?: string): ProcessedBibleVerse {
  let text = ''
  let wasTruncated = false

  // Check if we have verses array (preferred)
  if (data.verses && Array.isArray(data.verses) && data.verses.length > 0) {
    const totalVerses = data.verses.length
    const limitedVerses = data.verses.slice(0, MAX_VERSES)

    // Join verses with space
    text = limitedVerses.map((v) => v.text || '').join(' ')

    wasTruncated = totalVerses > MAX_VERSES
  } else if (data.text) {
    // Fallback to .text field if verses array not available
    text = data.text
  }

  // Clean up the text (remove extra whitespace)
  const cleanText = text.trim().replace(/\s+/g, ' ')

  // Add ellipsis if we truncated verses
  const finalText = wasTruncated ? cleanText + ' ...' : cleanText

  // Extract translation (bible-api.com returns translation_id like "kjv", "web", etc.)
  const translation = (data.translation_id || data.translation_name || 'KJV').toUpperCase()

  return {
    text: finalText,
    translation
  }
}

/**
 * Create BibleHub interlinear URL from a Bible reference
 * @param reference - Bible reference (e.g., "John 3:16", "Genesis 1:1-3", "Psalm 23")
 * @returns BibleHub interlinear URL
 */
export function createBibleHubInterlinearUrl(reference: string): string {
  // Parse reference: "Book Chapter:Verse" or "Book Chapter:Verse-Verse2" or "Book Chapter"
  const match = reference.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+))?/)

  if (!match) {
    // Fallback to main interlinear page if we can't parse
    return 'https://biblehub.com/interlinear/'
  }

  const [, book, chapter, verse] = match

  // Type guard: ensure book and chapter exist
  if (!book || !chapter) {
    return 'https://biblehub.com/interlinear/'
  }

  // Normalize book name for URL (lowercase, replace spaces with underscores)
  const bookSlug = book.toLowerCase().replace(/\s+/g, '_')

  // Build URL
  if (verse) {
    // Specific verse: /interlinear/book/chapter-verse.htm
    return `https://biblehub.com/interlinear/${bookSlug}/${chapter}-${verse}.htm`
  } else {
    // Chapter only: /interlinear/book/chapter.htm
    return `https://biblehub.com/interlinear/${bookSlug}/${chapter}.htm`
  }
}
