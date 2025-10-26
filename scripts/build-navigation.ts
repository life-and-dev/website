#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Minimal navigation tree node for client consumption
 * ONLY includes what's needed for rendering the menu
 */
export interface MinimalTreeNode {
  id: string
  title: string
  path: string
  type: 'link' | 'separator' | 'header' | 'external'
  children?: MinimalTreeNode[]
  description?: string
  isPrimary?: boolean
}

/**
 * Menu item type definitions
 */
type MenuItemType = string | { [key: string]: string | null | MenuItemType[] } | null

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
 * Extract frontmatter description from markdown content
 */
function extractDescription(content: string): string | undefined {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = frontmatterMatch?.[1]
  if (!frontmatter) return undefined

  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  return descMatch?.[1]?.trim()
}

/**
 * Fetch markdown file and extract H1 title and description
 */
async function fetchMarkdownMetadata(markdownPath: string): Promise<{
  title: string | null
  description: string | undefined
}> {
  try {
    const content = await fs.readFile(markdownPath, 'utf-8')
    return {
      title: extractH1Title(content),
      description: extractDescription(content)
    }
  } catch (error) {
    return { title: null, description: undefined }
  }
}

/**
 * Resolve relative/absolute paths in menu
 */
function resolvePath(menuPath: string, contextPath: string): string {
  // Absolute path
  if (menuPath.startsWith('/')) {
    return menuPath
  }

  // Parent directory (..)
  if (menuPath.startsWith('../')) {
    const contextSegments = contextPath.split('/').filter(Boolean)
    contextSegments.pop() // Remove last segment
    const relativePart = menuPath.substring(3) // Remove '../'
    return contextSegments.length > 0
      ? `/${contextSegments.join('/')}/${relativePart}`
      : `/${relativePart}`
  }

  // Current directory (./)
  if (menuPath.startsWith('./')) {
    const relativePart = menuPath.substring(2)
    return contextPath === '/' ? `/${relativePart}` : `${contextPath}/${relativePart}`
  }

  // Relative to context (no prefix)
  return contextPath === '/' ? `/${menuPath}` : `${contextPath}/${menuPath}`
}

/**
 * Get markdown file path from menu path
 */
function getMarkdownPath(menuPath: string): string {
  const sourceDir = getSourceDir()
  return path.join(sourceDir, `${menuPath}.md`)
}

/**
 * Process menu items recursively and build minimal tree structure
 */
async function processMenuItems(
  items: MenuItemType[],
  contextPath: string,
  order: number = 0
): Promise<{ nodes: MinimalTreeNode[], nextOrder: number }> {
  const nodes: MinimalTreeNode[] = []

  for (const item of items) {
    // Handle null/blank (separator) - legacy support
    if (item === null) {
      nodes.push({
        id: `separator-${order}`,
        title: '---',
        path: `${contextPath}/__separator-${order}`,
        type: 'separator'
      })
      order++
      continue
    }

    // Handle string items
    if (typeof item === 'string') {
      // Check for separator marker
      if (item === '===') {
        nodes.push({
          id: `separator-${order}`,
          title: '---',
          path: `${contextPath}/__separator-${order}`,
          type: 'separator'
        })
        order++
        continue
      }

      // String → lookup H1 and description from markdown file
      const resolvedPath = resolvePath(item, contextPath)
      const markdownPath = getMarkdownPath(resolvedPath)
      const { title, description } = await fetchMarkdownMetadata(markdownPath)

      nodes.push({
        id: `${resolvedPath.split('/').filter(Boolean).pop() || 'home'}-${order}`,
        title: title || item,
        path: resolvedPath,
        type: 'link',
        description,
        isPrimary: true
      })
      order++
      continue
    }

    // Handle object (custom title, external link, header, or submenu)
    if (typeof item === 'object') {
      for (const [key, value] of Object.entries(item)) {
        // Handle header marker (value === '===')
        if (value === '===') {
          nodes.push({
            id: `header-${order}`,
            title: key,
            path: `${contextPath}/__header-${order}`,
            type: 'header'
          })
          order++
          continue
        }

        // Handle null/empty value (legacy header support)
        if (value === null || value === '') {
          nodes.push({
            id: `header-${order}`,
            title: key,
            path: `${contextPath}/__header-${order}`,
            type: 'header'
          })
          order++
          continue
        }

        // Handle external URL
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          nodes.push({
            id: `external-${order}`,
            title: key,
            path: value,
            type: 'external'
          })
          order++
          continue
        }

        // Handle submenu (array value) - key is markdown filename
        if (Array.isArray(value)) {
          const submenuPath = resolvePath(key, contextPath)
          const markdownPath = getMarkdownPath(submenuPath)
          const { title, description } = await fetchMarkdownMetadata(markdownPath)

          // Process children recursively
          const { nodes: childNodes } = await processMenuItems(value, submenuPath, 0)

          nodes.push({
            id: `${submenuPath.split('/').filter(Boolean).pop() || 'home'}-${order}`,
            title: title || key,
            path: submenuPath,
            type: 'link',
            description,
            isPrimary: true,
            children: childNodes
          })
          order++
          continue
        }

        // Handle custom title with path (alias link)
        if (typeof value === 'string') {
          const resolvedPath = resolvePath(value, contextPath)
          const markdownPath = getMarkdownPath(resolvedPath)
          const { description } = await fetchMarkdownMetadata(markdownPath)

          nodes.push({
            id: `link-${key.replace(/\s+/g, '-').toLowerCase()}-${order}`,
            title: key,
            path: resolvedPath,
            type: 'link',
            description,
            isPrimary: false // Aliases are NOT primary
          })
          order++
        }
      }
    }
  }

  return { nodes, nextOrder: order }
}

/**
 * Build minimal navigation tree from _menu.yml
 */
export async function buildNavigationTree(): Promise<MinimalTreeNode[]> {
  const sourceDir = getSourceDir()
  const menuPath = path.join(sourceDir, '_menu.yml')

  try {
    // Read and parse _menu.yml
    const menuContent = await fs.readFile(menuPath, 'utf-8')
    const menuItems = parseYaml(menuContent) as MenuItemType[]

    // Process menu items recursively
    const { nodes } = await processMenuItems(menuItems, '/')

    return nodes
  } catch (error) {
    console.error('Error building navigation tree:', error)
    return []
  }
}

/**
 * Generate navigation JSON file
 */
export async function generateNavigationJson() {
  const domain = getContentDomain()
  console.log(`📋 Building navigation tree for: ${domain}`)

  const tree = await buildNavigationTree()
  const targetDir = getTargetDir()
  const outputPath = path.join(targetDir, '_navigation.json')

  await fs.ensureDir(targetDir)
  await fs.writeJson(outputPath, tree, { spaces: 2 })

  const fileSize = (await fs.stat(outputPath)).size
  const fileSizeKB = (fileSize / 1024).toFixed(2)

  console.log(`✓ Navigation tree generated: ${outputPath} (${fileSizeKB} KB)`)
  console.log(`✓ Total menu items: ${countNodes(tree)}\n`)
}

/**
 * Count total nodes in tree
 */
function countNodes(nodes: MinimalTreeNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    if (node.children) {
      count += countNodes(node.children)
    }
  }
  return count
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateNavigationJson().catch(console.error)
}
