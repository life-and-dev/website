#!/usr/bin/env node

import fs from 'fs-extra'
import { statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { stringify as yamlStringify } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']

interface GravPage {
  path: string
  frontmatter: Record<string, any>
  content: string
  template: string
  slug: string
  order: string
  visible: boolean
  depth: number
  sourceDir: string  // Directory where the original markdown file is located
}

interface ContentPage {
  description?: string
  template?: string
  [key: string]: any
}

interface MigrationStats {
  totalFiles: number
  processed: number
  bibleVerses: number
  internalLinks: number
  migratedImages: number
  menuFiles: number
  errors: string[]
}

interface MenuEntry {
  slug: string
  path?: string // Optional for non-local pages
  externalUrl?: string // Optional for external links
  order: number
  title?: string // For external links
}

class GravMigrator {
  private sourceDir: string
  private targetDir: string
  private pages: GravPage[] = []
  private stats: MigrationStats = {
    totalFiles: 0,
    processed: 0,
    bibleVerses: 0,
    internalLinks: 0,
    migratedImages: 0,
    menuFiles: 0,
    errors: []
  }
  private dryRun: boolean

  private targetDomain: string

  constructor(sourceDir: string, targetDir: string, dryRun: boolean = false, targetDomain: string = 'eternal') {
    this.sourceDir = sourceDir
    this.targetDir = targetDir
    this.dryRun = dryRun
    this.targetDomain = targetDomain
  }

  async migrate(limit: number = -1) {
    console.log(`Starting Grav to Nuxt Content migration...`)
    console.log(`Source: ${this.sourceDir}`)
    console.log(`Target: ${this.targetDir}`)
    console.log(`Domain: ${this.targetDomain}`)
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`)
    if (limit > 0) {
      console.log(`Limit: ${limit} page(s)`)
    }
    console.log('')

    try {
      // Step 1: Determine initial path from source directory
      // Extract path from sourceDir structure
      const baseSourceDir = path.resolve(path.dirname(path.dirname(__dirname)), 'eternal')
      let initialPath = ''

      if (this.sourceDir.includes('/pages/')) {
        // Extract path after /pages/
        const pagesIndex = this.sourceDir.indexOf('/pages/')
        const afterPages = this.sourceDir.substring(pagesIndex + 7)
        // Convert numbered Grav directories to clean paths
        initialPath = afterPages
          .split(path.sep)
          .map(part => {
            const matches = part.match(/^\d+\.(.+)$/)
            return matches ? matches[1] : part
          })
          .filter(part => part.length > 0)
          .join('/')

        // Strip domain prefix if present
        const domainPrefix = `${this.targetDomain}/`
        if (initialPath.startsWith(domainPrefix)) {
          initialPath = initialPath.substring(this.targetDomain.length + 1)
        } else if (initialPath === this.targetDomain) {
          initialPath = ''
        }
      }

      // Step 2: Scan all Grav pages
      const scanDir = await fs.pathExists(path.join(this.sourceDir, 'pages'))
        ? path.join(this.sourceDir, 'pages')
        : this.sourceDir
      await this.scanGravPages(scanDir, initialPath, 0, limit)
      console.log(`Found ${this.pages.length} pages to migrate\n`)

      // Step 3: Create content structure
      await this.createContentStructure()

      // Step 4: Generate menu.yml files
      await this.generateMenuFiles()

      // Step 5: Print summary
      this.printSummary()
    } catch (error) {
      console.error('Migration failed:', error)
      this.stats.errors.push(String(error))
    }
  }

  private async scanGravPages(
    dir: string = path.join(this.sourceDir, 'pages'),
    relativePath: string = '',
    depth: number = 0,
    limit: number = -1
  ) {
    const items = await fs.readdir(dir)

    // First, check for root-level markdown files (article.md, default.md, etc.)
    if (depth === 0) {
      const mdFiles = items.filter(f => f.endsWith('.md'))
      if (mdFiles.length > 0) {
        const mdFile = mdFiles[0] // Use first markdown file found
        const mdPath = path.join(dir, mdFile)
        const template = path.basename(mdFile, '.md')
        const content = await fs.readFile(mdPath, 'utf-8')
        const { data, content: body } = matter(content)

        // Extract order from directory name if present
        const dirName = path.basename(dir)
        const dirMatches = dirName.match(/^(\d+)\.(.+)$/)
        const order = dirMatches ? dirMatches[1] : '999'
        const slug = dirMatches ? dirMatches[2] : dirName

        this.pages.push({
          path: relativePath, // Use relative path passed from migrate()
          frontmatter: data,
          content: body,
          template,
          slug,
          order,
          visible: dirMatches !== null,
          depth: 0,
          sourceDir: dir
        })
        this.stats.totalFiles++

        if (limit > 0 && this.pages.length >= limit) {
          return
        }
      }
    }

    for (const item of items) {
      // Check if we've reached the limit
      if (limit > 0 && this.pages.length >= limit) {
        return
      }

      const itemPath = path.join(dir, item)
      const stat = await fs.stat(itemPath)

      if (stat.isDirectory()) {
        // Grav directories follow pattern: 01.slug or slug
        const matches = item.match(/^(\d+)\.(.+)$/)
        const order = matches ? matches[1] : '999'
        const slug = matches ? matches[2] : item
        const visible = matches !== null

        // Look for markdown files in this directory
        const files = await fs.readdir(itemPath)
        const mdFile = files.find(f => f.endsWith('.md'))

        if (mdFile) {
          const mdPath = path.join(itemPath, mdFile)
          const template = path.basename(mdFile, '.md')
          const content = await fs.readFile(mdPath, 'utf-8')
          const { data, content: body } = matter(content)

          const pageRelativePath = relativePath ? `${relativePath}/${slug}` : slug

          this.pages.push({
            path: pageRelativePath,
            frontmatter: data,
            content: body,
            template,
            slug,
            order,
            visible,
            depth: depth + 1,
            sourceDir: itemPath
          })
          this.stats.totalFiles++

          // Check if we've reached the limit after adding this page
          if (limit > 0 && this.pages.length >= limit) {
            return
          }
        }

        // Recursively scan subdirectories
        await this.scanGravPages(
          itemPath,
          relativePath ? `${relativePath}/${slug}` : slug,
          depth + 1,
          limit
        )
      }
    }
  }

  /**
   * Get all images in a directory
   */
  private async getImagesInDirectory(dirPath: string): Promise<string[]> {
    if (!await fs.pathExists(dirPath)) {
      return []
    }

    const items = await fs.readdir(dirPath)
    const images: string[] = []

    for (const item of items) {
      const ext = path.extname(item).toLowerCase()
      if (IMAGE_EXTENSIONS.includes(ext)) {
        images.push(item)
      }
    }

    return images
  }

  /**
   * Get the prefix for a page (used for image naming)
   */
  private getPagePrefix(page: GravPage): string {
    if (!page.path || page.path === '') {
      // Root page: use domain name as prefix
      return this.targetDomain
    }
    // Nested page: use the slug (last part of path)
    return page.slug
  }

  /**
   * Copy images for a page and return a map of old -> new filenames
   */
  private async copyPageImages(
    sourcePageDir: string,
    targetContentDir: string,
    prefix: string
  ): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>()
    const images = await this.getImagesInDirectory(sourcePageDir)

    for (const imageName of images) {
      const sourcePath = path.join(sourcePageDir, imageName)
      const ext = path.extname(imageName)
      const baseName = path.basename(imageName, ext)

      // Check if image name already starts with the prefix
      // Example: if prefix is "church" and image is "church.jpg", don't duplicate
      let newImageName: string
      if (baseName === prefix || baseName.startsWith(`${prefix}.`)) {
        // Already has correct prefix, keep original name
        newImageName = imageName
      } else {
        // Add prefix: {prefix}.{originalname}{ext}
        newImageName = `${prefix}.${baseName}${ext}`
      }

      const targetPath = path.join(targetContentDir, newImageName)

      if (!this.dryRun) {
        await fs.copy(sourcePath, targetPath)
      }

      imageMap.set(imageName, newImageName)
      this.stats.migratedImages++
    }

    return imageMap
  }

  /**
   * Update image references in markdown content
   */
  private processImageLinks(content: string, imageMap: Map<string, string>): string {
    if (imageMap.size === 0) {
      return content
    }

    // Pattern to match markdown images: ![alt](path)
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g

    return content.replace(imagePattern, (match, alt, imagePath) => {
      // Only process relative paths (not external URLs)
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return match
      }

      // Extract just the filename from the path
      const fileName = path.basename(imagePath)

      // Check if this image is in our map
      const newFileName = imageMap.get(fileName)
      if (newFileName) {
        return `![${alt}](${newFileName})`
      }

      // Image not found in map, keep original
      return match
    })
  }

  private async createContentStructure() {
    for (const page of this.pages) {
      try {
        this.stats.processed++
        const progress = Math.round((this.stats.processed / this.pages.length) * 100)
        process.stdout.write(`\rProcessing: ${progress}% (${this.stats.processed}/${this.pages.length})`)

        // Convert Grav path to Nuxt Content path
        // Root pages (empty path) use index.md, nested pages use {name}.md directly
        // Unpublished pages get .draft.md extension instead
        let filePath: string
        let targetContentDir: string

        if (!page.path || page.path === '') {
          // Root page: /content/{domain}/index.md or index.draft.md
          targetContentDir = path.join(this.targetDir, 'content', this.targetDomain)
          const filename = page.frontmatter.published === false ? 'index.draft.md' : 'index.md'
          filePath = path.join(targetContentDir, filename)
          if (!this.dryRun) {
            await fs.ensureDir(targetContentDir)
          }
        } else {
          // Nested page: /content/{domain}/path/to/page.md or page.draft.md (no directory)
          targetContentDir = path.join(this.targetDir, 'content', this.targetDomain, path.dirname(page.path))
          const baseName = path.basename(page.path)
          const extension = page.frontmatter.published === false ? '.draft.md' : '.md'
          const fileName = `${baseName}${extension}`
          filePath = path.join(targetContentDir, fileName)
          if (!this.dryRun) {
            await fs.ensureDir(targetContentDir)
          }
        }

        // Copy images and get mapping of old -> new filenames
        const pagePrefix = this.getPagePrefix(page)
        const imageMap = await this.copyPageImages(page.sourceDir, targetContentDir, pagePrefix)

        // Extract title for H1 header
        const pageTitle = page.frontmatter.title || this.titleCase(page.slug)

        // Transform frontmatter (without title, published, navigation)
        const nuxtFrontmatter: ContentPage = {
          ...this.transformFrontmatter(page.frontmatter)
        }

        // Only add optional fields if they exist
        if (page.frontmatter.description) {
          nuxtFrontmatter.description = page.frontmatter.description
        }
        if (page.template !== 'article' && page.template !== 'default') {
          nuxtFrontmatter.template = page.template
        }

        // Process content
        let processedContent = page.content

        // Shift existing headers down one level (H1→H2, H2→H3, etc.)
        processedContent = this.shiftHeadersDown(processedContent)

        // Prepend H1 title as first line
        processedContent = `# ${pageTitle}\n\n${processedContent}`

        // Convert internal links (pass page path and source directory for relative link resolution)
        processedContent = this.convertInternalLinks(processedContent, page.path, page.sourceDir)

        // Process image links (update to new filenames)
        processedContent = this.processImageLinks(processedContent, imageMap)

        // Process Bible verses
        processedContent = this.processBibleVerses(processedContent)

        // Create file content with frontmatter
        // If frontmatter is empty, only add description if it exists, otherwise skip frontmatter
        let fileContent: string
        if (Object.keys(nuxtFrontmatter).length === 0) {
          // No frontmatter - just content
          fileContent = processedContent
        } else {
          // Has frontmatter - use gray-matter
          fileContent = matter.stringify(processedContent, nuxtFrontmatter)
        }

        if (!this.dryRun) {
          await fs.writeFile(filePath, fileContent)
        }
      } catch (error) {
        this.stats.errors.push(`Error processing ${page.path}: ${error}`)
      }
    }
    process.stdout.write('\n\n')
  }

  private transformFrontmatter(frontmatter: Record<string, any>): Record<string, any> {
    const transformed: Record<string, any> = {}

    // Skip certain Grav-specific fields and new excluded fields
    const skipFields = ['title', 'description', 'published', 'taxonomy', 'process', 'cache_enable', 'visible', 'navigation']

    for (const [key, value] of Object.entries(frontmatter)) {
      if (!skipFields.includes(key)) {
        transformed[key] = value
      }
    }

    return transformed
  }

  /**
   * Shift all markdown headers down one level (H1→H2, H2→H3, etc.)
   */
  private shiftHeadersDown(content: string): string {
    // Split content by lines
    const lines = content.split('\n')
    const processedLines: string[] = []

    for (const line of lines) {
      // Check if line starts with markdown header syntax
      const headerMatch = line.match(/^(#{1,5})\s+(.*)$/)
      if (headerMatch) {
        // Add one more # to shift header down
        const hashes = headerMatch[1]
        const headerText = headerMatch[2]
        processedLines.push(`#${hashes} ${headerText}`)
      } else {
        processedLines.push(line)
      }
    }

    return processedLines.join('\n')
  }

  private convertInternalLinks(content: string, pagePath: string, sourceDir: string): string {
    // Pattern to match both absolute and relative internal links
    // Matches: [text](/absolute) and [text](relative)
    // But NOT images: ![text](url)
    const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g

    return content.replace(linkPattern, (match, text, url) => {
      // Skip external URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return match
      }

      // Skip anchors and fragments
      if (url.startsWith('#')) {
        return match
      }

      // Skip image files (check file extension)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
      if (imageExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
        return match
      }

      this.stats.internalLinks++

      // Parse URL and fragment
      const fragmentIndex = url.indexOf('#')
      const hasFragment = fragmentIndex !== -1
      const urlWithoutFragment = hasFragment ? url.substring(0, fragmentIndex) : url
      const fragment = hasFragment ? url.substring(fragmentIndex + 1) : undefined

      let cleanUrl: string
      let isRelative = false

      if (url.startsWith('/')) {
        // Absolute link: /04.kingdom/05.church/history
        cleanUrl = urlWithoutFragment.substring(1) // Remove leading /
      } else if (url.startsWith('../')) {
        // Parent link: ../parent or ../../grandparent
        // Keep as relative
        cleanUrl = urlWithoutFragment
        isRelative = true
      } else {
        // Relative link: christian, messianic, etc.
        // Check if it's a child directory or actual sibling file

        if (!url.includes('/')) {
          // Single segment - could be sibling file or child directory
          // Check if source directory has a subdirectory matching this name (with or without number prefix)
          let isChildDirectory = false

          try {
            const items = fs.readdirSync(sourceDir)
            // Check for exact match or numbered prefix match (e.g., "03.christian")
            isChildDirectory = items.some(item => {
              const itemPath = path.join(sourceDir, item)
              if (!statSync(itemPath).isDirectory()) return false

              // Match exact name or strip numbered prefix
              if (item === urlWithoutFragment) return true
              const matches = item.match(/^\d+\.(.+)$/)
              return matches && matches[1] === urlWithoutFragment
            })
          } catch (error) {
            // If directory doesn't exist or can't be read, assume not a child
            isChildDirectory = false
          }

          if (isChildDirectory) {
            // It's a child directory - make absolute
            const pageDir = pagePath || ''
            cleanUrl = pageDir ? `${pageDir}/${urlWithoutFragment}` : urlWithoutFragment
            isRelative = false
          } else {
            // It's a sibling file in same directory - keep relative
            cleanUrl = urlWithoutFragment
            isRelative = true
          }
        } else {
          // Contains '/' - subdirectory link - make absolute
          const pageDir = pagePath || ''
          cleanUrl = pageDir ? `${pageDir}/${urlWithoutFragment}` : urlWithoutFragment
          isRelative = false
        }
      }

      // If not relative, strip numbered prefixes and domain, then add /content/{domain}/ prefix
      if (!isRelative) {
        // Strip numbered prefixes from URL parts (e.g., 05.church → church)
        cleanUrl = cleanUrl
          .split('/')
          .map(part => {
            const matches = part.match(/^\d+\.(.+)$/)
            return matches ? matches[1] : part
          })
          .filter(part => part.length > 0)
          .join('/')

        // Strip domain prefix if present (e.g., kingdom/church → church)
        const domainPrefix = `${this.targetDomain}/`
        if (cleanUrl.startsWith(domainPrefix)) {
          cleanUrl = cleanUrl.substring(this.targetDomain.length + 1)
        }

        // Ensure URL starts with /
        if (!cleanUrl.startsWith('/')) {
          cleanUrl = '/' + cleanUrl
        }

        // Prepend /content/{domain}/ for IDE navigation support
        // ProseA component will strip this prefix for web routes
        cleanUrl = `/content/${this.targetDomain}${cleanUrl}`
      }

      // Add .md extension for IDE preview compatibility
      // (ProseA component will strip this for web routes)
      cleanUrl = cleanUrl + '.md'

      // Reattach fragment if present
      if (hasFragment) {
        cleanUrl = `${cleanUrl}#${fragment}`
      }

      return `[${text}](${cleanUrl})`
    })
  }

  private processBibleVerses(content: string): string {
    // Count Bible verses for statistics, but preserve original text format
    // The client-side plugin will handle tooltip injection dynamically

    const biblePatterns = [
      // Standard format: John 3:16 (ESV)
      /\b(\d?\s?[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s+(\d+):(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\s*\(([A-Z]+)\)/g,
      // Range with spaces: 2 Corinthians 4:16 - 5:9 (ESV)
      /\b(\d?\s?[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)\s*\(([A-Z]+)\)/g,
      // Without translation
      /\b(\d?\s?[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)\s+(\d+):(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\b(?!\s*\()/g
    ]

    // Count Bible verses for stats, but don't modify content
    let tempContent = content

    biblePatterns.forEach(pattern => {
      const matches = tempContent.match(pattern)
      if (matches) {
        this.stats.bibleVerses += matches.length
      }
      // Reset regex state
      pattern.lastIndex = 0
    })

    // Return content unchanged - client-side plugin handles enhancement
    return content
  }


  private titleCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Generate menu.yml files for directories with sub-pages
   */
  private async generateMenuFiles() {
    console.log('\nGenerating menu.yml files...')

    // Group pages by their parent directory
    const pagesByDir = new Map<string, GravPage[]>()

    for (const page of this.pages) {
      const parentDir = page.path ? path.dirname(page.path) : ''
      const parentKey = parentDir || '/' // Root directory

      if (!pagesByDir.has(parentKey)) {
        pagesByDir.set(parentKey, [])
      }
      pagesByDir.get(parentKey)!.push(page)
    }

    // Generate menu.yml for each directory that has children
    for (const [dirPath, pagesInDir] of pagesByDir) {
      // Skip if no pages or only one page
      if (pagesInDir.length <= 1) continue

      // Filter out draft pages
      const publishedPages = pagesInDir.filter(p => p.frontmatter.published !== false)

      // Skip if no published pages after filtering
      if (publishedPages.length === 0) continue

      // Sort by order
      publishedPages.sort((a, b) => parseInt(a.order) - parseInt(b.order))

      // Build menu data
      const menuData: Record<string, string | number> = {}

      for (const page of publishedPages) {
        const slug = page.slug
        const pagePath = page.path || ''

        // Determine if this is a local page (in same directory)
        const pageDir = pagePath ? path.dirname(pagePath) : ''
        const isLocal = pageDir === dirPath

        if (isLocal) {
          // Local page: use '.' to indicate same directory
          menuData[slug] = '.'
        } else {
          // Non-local page: slug with absolute path
          menuData[slug] = `/${pagePath}`
        }
      }

      // Write menu.yml file
      const targetDir = dirPath === '/' || dirPath === ''
        ? path.join(this.targetDir, 'content', this.targetDomain)
        : path.join(this.targetDir, 'content', this.targetDomain, dirPath)

      const menuPath = path.join(targetDir, '_menu.yml')
      const menuYaml = yamlStringify(menuData)

      if (!this.dryRun) {
        await fs.ensureDir(targetDir)
        await fs.writeFile(menuPath, menuYaml, 'utf-8')
      }

      this.stats.menuFiles++
      console.log(`  ✓ Generated _menu.yml for: ${dirPath || '/'}`)
    }

    console.log(`\nGenerated ${this.stats.menuFiles} _menu.yml files\n`)
  }

  private printSummary() {
    console.log('╔════════════════════════════════════════════╗')
    console.log('║           MIGRATION SUMMARY                ║')
    console.log('╠════════════════════════════════════════════╣')
    console.log(`║ Total Files:        ${this.stats.totalFiles.toString().padEnd(22)} ║`)
    console.log(`║ Processed:          ${this.stats.processed.toString().padEnd(22)} ║`)
    console.log(`║ Bible Verses:       ${this.stats.bibleVerses.toString().padEnd(22)} ║`)
    console.log(`║ Internal Links:     ${this.stats.internalLinks.toString().padEnd(22)} ║`)
    console.log(`║ Migrated Images:    ${this.stats.migratedImages.toString().padEnd(22)} ║`)
    console.log(`║ Menu Files:         ${this.stats.menuFiles.toString().padEnd(22)} ║`)
    console.log(`║ Errors:             ${this.stats.errors.length.toString().padEnd(22)} ║`)
    console.log('╚════════════════════════════════════════════╝')

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    if (this.dryRun) {
      console.log('\n✨ DRY RUN COMPLETE - No files were written')
      console.log('Run without --dry-run flag to perform actual migration')
    } else {
      console.log('\n✅ Migration complete!')
      console.log('\nNext steps:')
      console.log('1. Run: npm run dev')
      console.log('2. Visit: http://localhost:3000')
      console.log('3. Build for production: npm run generate')
    }
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  // Parse limit argument
  let limit = -1
  const limitIndex = args.findIndex(arg => arg.startsWith('--limit='))
  if (limitIndex !== -1) {
    limit = parseInt(args[limitIndex].split('=')[1])
  } else if (args.includes('--test')) {
    limit = 1 // Test mode: migrate only 1 page
  }

  // Parse section argument
  let section = ''
  const sectionIndex = args.findIndex(arg => arg.startsWith('--section='))
  if (sectionIndex !== -1) {
    section = args[sectionIndex].split('=')[1]
  }

  // Parse domain argument
  let domain = 'eternal'
  const domainIndex = args.findIndex(arg => arg.startsWith('--domain='))
  if (domainIndex !== -1) {
    domain = args[domainIndex].split('=')[1]
  }

  const baseSourceDir = path.resolve(__dirname, '../../eternal')
  const sourceDir = section ? path.join(baseSourceDir, 'pages', section) : baseSourceDir
  const targetDir = path.resolve(__dirname, '..')

  // Check if source directory exists
  if (!await fs.pathExists(sourceDir)) {
    console.error(`Error: Source directory not found: ${sourceDir}`)
    process.exit(1)
  }

  const migrator = new GravMigrator(sourceDir, targetDir, dryRun, domain)
  await migrator.migrate(limit)
}

main().catch(console.error)