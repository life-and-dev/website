#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Minimal search index entry
 * ONLY includes what's needed for search functionality
 */
export interface SearchIndexEntry {
  path: string
  title: string
  description?: string
  keywords?: string[]
  excerpt?: string
}

/**
 * Get content domain from environment variable
 */
function getContentDomain(): string {
  return process.env.CONTENT || 'ofgod'
}

/**
 * Get source directory for content domain
 */
function getSourceDir(): string {
  return path.resolve(__dirname, '..', 'content', getContentDomain())
}

/**
 * Get target public directory
 */
function getTargetDir(): string {
  return path.resolve(__dirname, '..', 'public')
}

/**
 * Extract H1 title from markdown content
 */
function extractH1Title(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m)
  return h1Match?.[1]?.trim() ?? null
}

/**
 * Extract frontmatter metadata from markdown content
 */
function extractFrontmatter(content: string): {
  description?: string
  keywords?: string[]
} {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = frontmatterMatch?.[1]
  if (!frontmatter) return {}

  // Extract description
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  const description = descMatch?.[1]?.trim()

  // Extract keywords (YAML array format)
  const keywordsMatch = frontmatter.match(/^keywords:\s*\[(.*)\]$/m)
  const keywordsStr = keywordsMatch?.[1]
  let keywords: string[] | undefined
  if (keywordsStr) {
    keywords = keywordsStr
      .split(',')
      .map(k => k.trim().replace(/['"]/g, ''))
      .filter(Boolean)
  }

  return { description, keywords }
}

/**
 * Extract excerpt from markdown content (first 150 chars after frontmatter and H1)
 */
function extractExcerpt(content: string): string | undefined {
  // Remove frontmatter
  let cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '')

  // Remove H1
  cleanContent = cleanContent.replace(/^#\s+.+$/m, '')

  // Get first paragraph, trim whitespace
  const firstParagraph = cleanContent.trim().split('\n\n')[0]
  if (!firstParagraph) return undefined

  // Trim to 150 chars
  const excerpt = firstParagraph.trim().substring(0, 150)
  return excerpt.length > 0 ? excerpt : undefined
}

/**
 * Convert file path to URL path
 */
function filePathToUrlPath(filePath: string, sourceDir: string): string {
  const relativePath = path.relative(sourceDir, filePath)
  const urlPath = '/' + relativePath
    .replace(/\.md$/, '')
    .replace(/index$/, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')

  return urlPath === '' ? '/' : urlPath
}

/**
 * Get all markdown files recursively
 */
async function getAllMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  if (!await fs.pathExists(dir)) {
    return files
  }

  const items = await fs.readdir(dir)

  for (const item of items) {
    const itemPath = path.join(dir, item)
    const stat = await fs.stat(itemPath)

    if (stat.isDirectory()) {
      const subFiles = await getAllMarkdownFiles(itemPath)
      files.push(...subFiles)
    } else if (item.endsWith('.md') && !item.endsWith('.draft.md')) {
      // Only include published markdown files
      files.push(itemPath)
    }
  }

  return files
}

/**
 * Build search index from all markdown files
 */
export async function buildSearchIndex(): Promise<SearchIndexEntry[]> {
  const sourceDir = getSourceDir()
  const markdownFiles = await getAllMarkdownFiles(sourceDir)

  const index: SearchIndexEntry[] = []

  for (const filePath of markdownFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const title = extractH1Title(content)
      const { description, keywords } = extractFrontmatter(content)
      const excerpt = extractExcerpt(content)
      const urlPath = filePathToUrlPath(filePath, sourceDir)

      // Skip files without H1 (malformed)
      if (!title) {
        console.warn(`⚠️  No H1 found in: ${path.relative(sourceDir, filePath)}`)
        continue
      }

      index.push({
        path: urlPath,
        title,
        description,
        keywords,
        excerpt
      })
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error)
    }
  }

  return index
}

/**
 * Generate search index JSON file
 */
export async function generateSearchIndexJson() {
  const domain = getContentDomain()
  console.log(`🔍 Building search index for: ${domain}`)

  const index = await buildSearchIndex()
  const targetDir = getTargetDir()
  const outputPath = path.join(targetDir, '_search-index.json')

  await fs.ensureDir(targetDir)
  await fs.writeJson(outputPath, index, { spaces: 2 })

  const fileSize = (await fs.stat(outputPath)).size
  const fileSizeKB = (fileSize / 1024).toFixed(2)

  console.log(`✓ Search index generated: ${outputPath} (${fileSizeKB} KB)`)
  console.log(`✓ Total indexed pages: ${index.length}\n`)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSearchIndexJson().catch(console.error)
}
