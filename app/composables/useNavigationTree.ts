import { parse as parseYaml } from 'yaml'

export interface TreeNode {
  id: string
  title: string
  path: string
  order: number
  children: TreeNode[]
  parent?: TreeNode
  externalUrl?: string
  isExternal?: boolean
  isSeparator?: boolean
  isHeader?: boolean
  isPrimary?: boolean  // Marks primary menu items (string/array syntax, not aliases)
  description?: string
  keywords?: string[]
}

/**
 * Generate cache key that changes every hour
 * This ensures menu changes are picked up within 1 hour
 */
function getCacheKey(): string {
  const now = new Date()
  const hourTimestamp = Math.floor(now.getTime() / (1000 * 60 * 60)) // Changes every hour
  return `navigation-tree-${hourTimestamp}`
}

/**
 * Build hierarchical navigation tree from @nuxt/content collection
 */
export function useNavigationTree() {
  // Use useState for server-side rendering and client hydration
  // Cache key changes hourly to pick up menu structure changes
  const tree = useState<TreeNode | null>(getCacheKey(), () => null)
  // Use useState for loading state to prevent duplicate fetches across components
  const isLoading = useState<boolean>(`${getCacheKey()}-loading`, () => false)

  /**
   * Load navigation tree from content collection
   * Uses cached tree if available to avoid rebuilding on every navigation
   * Prevents concurrent fetches when multiple components mount simultaneously
   */
  async function loadTree() {
    // Return if already loaded OR currently loading (prevents race condition)
    if (tree.value !== null || isLoading.value) {
      return
    }

    isLoading.value = true
    try {
      const pages = await queryCollection('content').all()
      tree.value = await buildTreeFromPages(pages)
    } catch (error) {
      console.error('Error loading navigation tree:', error)
      tree.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Find node by path in tree
   */
  function findNodeByPath(path: string, node: TreeNode | null = tree.value): TreeNode | null {
    if (!node) return null
    if (node.path === path) return node

    for (const child of node.children) {
      const found = findNodeByPath(path, child)
      if (found) return found
    }

    return null
  }

  /**
   * Find primary node by path in tree (only returns nodes with isPrimary=true)
   */
  function findPrimaryNodeByPath(path: string, node: TreeNode | null = tree.value): TreeNode | null {
    if (!node) return null
    if (node.path === path && node.isPrimary) return node

    for (const child of node.children) {
      const found = findPrimaryNodeByPath(path, child)
      if (found) return found
    }

    return null
  }

  /**
   * Get all ancestor paths for a given path
   */
  function getAncestorPaths(path: string): string[] {
    const segments = path.split('/').filter(Boolean)
    const ancestors: string[] = ['/']

    for (let i = 0; i < segments.length - 1; i++) {
      ancestors.push('/' + segments.slice(0, i + 1).join('/'))
    }

    return ancestors
  }

  /**
   * Get sibling nodes at the same level
   */
  function getSiblings(nodePath: string): TreeNode[] {
    const node = findNodeByPath(nodePath)
    if (!node || !node.parent) return []
    return node.parent.children.filter(child => child.path !== nodePath)
  }

  return {
    tree,
    isLoading,
    loadTree,
    findNodeByPath,
    findPrimaryNodeByPath,
    getAncestorPaths,
    getSiblings
  }
}

/**
 * Extract H1 title from markdown content or body object
 */
function extractH1Title(content: string | any): string | null {
  // Handle both string content and @nuxt/content body objects
  if (!content) return null

  // If content is a string, extract H1 directly
  if (typeof content === 'string') {
    const h1Match = content.match(/^#\s+(.+)$/m)
    return h1Match?.[1]?.trim() ?? null
  }

  // If content is an object (AST from @nuxt/content), look for excerpt or first heading
  if (typeof content === 'object') {
    // Try to get the first h1 from the AST
    if (content.children && Array.isArray(content.children)) {
      for (const child of content.children) {
        if (child.tag === 'h1' && child.children?.[0]?.value) {
          return child.children[0].value.trim()
        }
      }
    }
  }

  return null
}

/**
 * Build tree structure from flat array of pages
 */
async function buildTreeFromPages(pages: any[]): Promise<TreeNode> {
  // Create root node
  const root: TreeNode = {
    id: 'root',
    title: 'Home',
    path: '/',
    order: -1,
    children: []
  }

  // Map to store all nodes by path
  const nodeMap = new Map<string, TreeNode>()
  nodeMap.set('/', root)

  // First pass: create all nodes
  for (const page of pages) {
    const path = page.path || '/'

    // Extract title from H1 header in content body
    const title = extractH1Title(page.body || '') || page.title || path.split('/').filter(Boolean).pop() || 'Home'

    if (path === '/') {
      // Update root node with actual page data
      root.title = title
      continue
    }

    const segments = path.split('/').filter(Boolean)
    const id = segments[segments.length - 1] || 'home'

    // Default order - will be overridden by menu.yml
    const order = 999

    const node: TreeNode = {
      id,
      title,
      path,
      order,
      children: [],
      description: page.description,
      keywords: page.keywords
    }

    nodeMap.set(path, node)
  }

  // Second pass: read menu.yml files and update order (also creates external nodes and separators)
  await applyMenuOrdering(nodeMap, root)

  // Third pass: build tree structure for nodes NOT already processed by menu ordering
  // (Menu-ordered nodes already have parent/children relationships set)
  for (const [path, node] of nodeMap) {
    if (path === '/') continue

    // Skip nodes already processed by menu ordering (have parent set) or special nodes
    if (node.parent || node.isExternal || node.isSeparator || node.isHeader) continue

    // Find parent path
    const segments = path.split('/').filter(Boolean)
    const parentPath = segments.length === 1
      ? '/'
      : '/' + segments.slice(0, -1).join('/')

    const parent = nodeMap.get(parentPath)
    if (parent) {
      node.parent = parent
      // Only add to children if not already there (avoid duplicates)
      if (!parent.children.includes(node)) {
        parent.children.push(node)
      }
    } else {
      // Orphaned node, attach to root
      node.parent = root
      if (!root.children.includes(node)) {
        root.children.push(node)
      }
    }
  }

  // Sort children by order
  sortTreeChildren(root)

  return root
}

/**
 * Menu item type definitions
 */
type MenuItemType = string | { [key: string]: string | null | MenuItemType[] } | null

/**
 * Parse hierarchical YAML menu into tree structure
 */
async function applyMenuOrdering(nodeMap: Map<string, TreeNode>, root: TreeNode) {
  try {
    // Fetch root _menu.yml from /public/
    const menuContent = await $fetch<string>('/_menu.yml', {
      parseResponse: txt => txt,
      headers: { 'Accept': 'text/yaml, text/plain' }
    }).catch(() => null)

    if (!menuContent) {
      // No menu file - sort all nodes alphabetically
      sortNodesAlphabetically(nodeMap, root)
      return
    }

    // Parse YAML using standard parser
    const menuItems = parseYaml(menuContent) as MenuItemType[]

    // Track which nodes have been ordered
    const orderedNodes = new Set<TreeNode>()

    // Process menu items recursively
    let order = 0
    await processMenuItems(menuItems, root, nodeMap, orderedNodes, order, '/')

    // Add unlisted nodes alphabetically at the end
    addUnlistedNodes(nodeMap, root, orderedNodes)

  } catch (error) {
    console.error('Error applying menu ordering:', error)
    sortNodesAlphabetically(nodeMap, root)
  }
}

/**
 * Check if node is an ancestor of potentialDescendant
 */
function isAncestor(node: TreeNode, potentialDescendant: TreeNode): boolean {
  let current: TreeNode | undefined = potentialDescendant
  while (current) {
    if (current === node) return true
    current = current.parent
  }
  return false
}

/**
 * Process menu items recursively and build tree structure
 */
async function processMenuItems(
  items: MenuItemType[],
  parent: TreeNode,
  nodeMap: Map<string, TreeNode>,
  orderedNodes: Set<TreeNode>,
  startOrder: number,
  contextPath: string
): Promise<number> {
  let order = startOrder

  for (const item of items) {
    // Handle null/blank (separator) - legacy support
    if (item === null) {
      const separatorId = `separator-${order}`
      const separatorPath = contextPath === '/' ? `/__${separatorId}` : `${contextPath}/__${separatorId}`
      const separator: TreeNode = {
        id: separatorId,
        title: '---',
        path: separatorPath,
        order: order++,
        children: [],
        isSeparator: true,
        parent: parent
      }
      nodeMap.set(separatorPath, separator)
      parent.children.push(separator)
      orderedNodes.add(separator)
      continue
    }

    // Handle string items
    if (typeof item === 'string') {
      // Check for separator marker
      if (item === '===') {
        const separatorId = `separator-${order}`
        const separatorPath = contextPath === '/' ? `/__${separatorId}` : `${contextPath}/__${separatorId}`
        const separator: TreeNode = {
          id: separatorId,
          title: '---',
          path: separatorPath,
          order: order++,
          children: [],
          isSeparator: true,
          parent: parent
        }
        nodeMap.set(separatorPath, separator)
        parent.children.push(separator)
        orderedNodes.add(separator)
        continue
      }

      // String → lookup H1 from markdown file
      const resolvedPath = resolvePath(item, contextPath)
      const node = nodeMap.get(resolvedPath)

      if (node && !orderedNodes.has(node)) {
        // Prevent circular references (e.g., adding root as child of a submenu)
        if (isAncestor(node, parent)) {
          console.warn(`Circular reference prevented: ${node.path} cannot be child of ${parent.path}`)
          continue
        }

        // Try to fetch H1 title from markdown file
        const h1Title = await fetchMarkdownH1(resolvedPath)
        if (h1Title) {
          node.title = h1Title
        }

        node.order = order++
        node.parent = parent
        node.isPrimary = true  // Mark as primary menu item
        if (!parent.children.includes(node)) {
          parent.children.push(node)
        }
        orderedNodes.add(node)
      } else if (!node) {
        console.warn(`Menu item not found: ${item} (resolved: ${resolvedPath})`)
      }
      continue
    }

    // Handle object (custom title, external link, header, or submenu)
    if (typeof item === 'object') {
      for (const [key, value] of Object.entries(item)) {
        // Handle header marker (value === '===')
        if (value === '===') {
          const headerId = `header-${order}`
          const headerPath = contextPath === '/' ? `/__${headerId}` : `${contextPath}/__${headerId}`
          const header: TreeNode = {
            id: headerId,
            title: key,
            path: headerPath,
            order: order++,
            children: [],
            isHeader: true,
            parent: parent
          }
          nodeMap.set(headerPath, header)
          parent.children.push(header)
          orderedNodes.add(header)
          continue
        }

        // Handle null/empty value (legacy header support)
        if (value === null || value === '') {
          const headerId = `header-${order}`
          const headerPath = contextPath === '/' ? `/__${headerId}` : `${contextPath}/__${headerId}`
          const header: TreeNode = {
            id: headerId,
            title: key,
            path: headerPath,
            order: order++,
            children: [],
            isHeader: true,
            parent: parent
          }
          nodeMap.set(headerPath, header)
          parent.children.push(header)
          orderedNodes.add(header)
          continue
        }

        // Handle external URL
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          const externalId = `external-${key}`
          const external: TreeNode = {
            id: externalId,
            title: key,
            path: value,
            order: order++,
            children: [],
            externalUrl: value,
            isExternal: true,
            parent: parent
          }
          nodeMap.set(value, external)
          parent.children.push(external)
          orderedNodes.add(external)
          continue
        }

        // Handle submenu (array value) - key is markdown filename
        if (Array.isArray(value)) {
          // Find the parent node for this submenu
          const submenuPath = resolvePath(key, contextPath)
          const submenuNode = nodeMap.get(submenuPath)

          if (submenuNode && !orderedNodes.has(submenuNode)) {
            // Try to fetch H1 title from markdown file
            const h1Title = await fetchMarkdownH1(submenuPath)
            if (h1Title) {
              submenuNode.title = h1Title
            }

            submenuNode.order = order++
            submenuNode.parent = parent
            submenuNode.isPrimary = true  // Mark submenu parent as primary
            if (!parent.children.includes(submenuNode)) {
              parent.children.push(submenuNode)
            }
            orderedNodes.add(submenuNode)

            // Process children recursively
            order = await processMenuItems(value, submenuNode, nodeMap, orderedNodes, 0, submenuPath)
          } else if (!submenuNode) {
            console.warn(`Submenu parent not found: ${key} (resolved: ${submenuPath})`)
          }
          continue
        }

        // Handle custom title with path (alias link)
        if (typeof value === 'string') {
          const resolvedPath = resolvePath(value, contextPath)
          const node = nodeMap.get(resolvedPath)

          if (node && !orderedNodes.has(node)) {
            // Always create a link-only node for custom titled links
            // This prevents expansion even if the target page has children
            const linkNode: TreeNode = {
              id: `link-${key.replace(/\s+/g, '-').toLowerCase()}-${order}`,
              title: key,
              path: resolvedPath,
              order: order++,
              children: [],  // No children - never expandable
              parent: parent,
              isExternal: false,
              isPrimary: false,  // Aliases are NOT primary
              description: node.description,  // Copy description for tooltips
              keywords: node.keywords  // Copy keywords for search
            }
            parent.children.push(linkNode)
            orderedNodes.add(linkNode)
          } else if (!node) {
            console.warn(`Menu item not found: ${key} -> ${value} (resolved: ${resolvedPath})`)
          }
        }
      }
    }
  }

  return order
}

/**
 * Resolve relative/absolute paths in menu
 */
function resolvePath(path: string, contextPath: string): string {
  // Absolute path
  if (path.startsWith('/')) {
    return path
  }

  // Parent directory (..)
  if (path.startsWith('../')) {
    const contextSegments = contextPath.split('/').filter(Boolean)
    contextSegments.pop() // Remove last segment
    const relativePart = path.substring(3) // Remove '../'
    return contextSegments.length > 0
      ? `/${contextSegments.join('/')}/${relativePart}`
      : `/${relativePart}`
  }

  // Current directory (./)
  if (path.startsWith('./')) {
    const relativePart = path.substring(2)
    return contextPath === '/' ? `/${relativePart}` : `${contextPath}/${relativePart}`
  }

  // Relative to context (no prefix)
  return contextPath === '/' ? `/${path}` : `${contextPath}/${path}`
}

/**
 * Cache for H1 titles to avoid duplicate fetches
 */
const h1TitleCache = new Map<string, string | null>()

/**
 * Fetch and extract H1 title from markdown file
 * Returns null if file not found or no H1 present
 * Results are cached to prevent duplicate fetches
 */
async function fetchMarkdownH1(path: string): Promise<string | null> {
  // Check cache first
  if (h1TitleCache.has(path)) {
    return h1TitleCache.get(path) ?? null
  }

  try {
    // Fetch markdown file from public directory
    const mdContent = await $fetch<string>(path + '.md', {
      parseResponse: txt => txt,
      headers: { 'Accept': 'text/markdown, text/plain' }
    }).catch(() => null)

    if (!mdContent) {
      h1TitleCache.set(path, null)
      return null
    }

    // Extract first H1 heading
    const h1Match = mdContent.match(/^#\s+(.+)$/m)
    const h1Title = h1Match?.[1]?.trim() ?? null

    // Cache the result
    h1TitleCache.set(path, h1Title)
    return h1Title
  } catch (error) {
    console.warn(`Failed to fetch H1 from ${path}.md:`, error)
    h1TitleCache.set(path, null)
    return null
  }
}

/**
 * Sort all nodes alphabetically (fallback when no menu exists)
 */
function sortNodesAlphabetically(nodeMap: Map<string, TreeNode>, root: TreeNode) {
  const nodes = Array.from(nodeMap.values()).filter(n => n.path !== '/')
  nodes.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  nodes.forEach((node, index) => {
    node.order = index
  })
}

/**
 * Add nodes not listed in menu alphabetically at the end
 */
function addUnlistedNodes(nodeMap: Map<string, TreeNode>, root: TreeNode, orderedNodes: Set<TreeNode>) {
  const unlistedNodes = Array.from(nodeMap.values()).filter(
    n => !orderedNodes.has(n) && !n.isExternal && !n.isSeparator && !n.isHeader && n.path !== '/'
  )

  if (unlistedNodes.length > 0) {
    unlistedNodes.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))

    // Group unlisted nodes by parent
    const byParent = new Map<string, TreeNode[]>()
    for (const node of unlistedNodes) {
      const segments = node.path.split('/').filter(Boolean)
      const parentPath = segments.length === 1 ? '/' : '/' + segments.slice(0, -1).join('/')

      if (!byParent.has(parentPath)) {
        byParent.set(parentPath, [])
      }
      byParent.get(parentPath)!.push(node)
    }

    // Assign order to unlisted nodes
    for (const [parentPath, nodes] of byParent) {
      const parent = nodeMap.get(parentPath) || root
      const maxOrder = parent.children.reduce((max, child) => Math.max(max, child.order), -1)

      nodes.forEach((node, index) => {
        node.order = maxOrder + index + 1
      })
    }
  }
}

/**
 * Recursively sort tree children by order
 */
function sortTreeChildren(node: TreeNode, visited = new Set<TreeNode>()) {
  // Prevent infinite recursion from circular references
  if (visited.has(node)) {
    console.warn('Circular reference detected in tree structure:', node.path)
    return
  }
  visited.add(node)

  node.children.sort((a, b) => a.order - b.order)
  for (const child of node.children) {
    sortTreeChildren(child, visited)
  }
}
