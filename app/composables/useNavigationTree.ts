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
  description?: string
  keywords?: string[]
}

/**
 * Build hierarchical navigation tree from @nuxt/content collection
 */
export function useNavigationTree() {
  const tree = ref<TreeNode | null>(null)
  const isLoading = ref(false)

  /**
   * Load navigation tree from content collection
   */
  async function loadTree() {
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

    // Debug: Log first few nodes
    if (import.meta.dev && nodeMap.size <= 5) {
      console.log(`[Tree] Created node: id="${id}", path="${path}", title="${title}"`)
    }
  }

  // Second pass: read menu.yml files and update order (also creates external nodes and separators)
  await applyMenuOrdering(nodeMap, root)

  // Third pass: build tree structure
  for (const [path, node] of nodeMap) {
    if (path === '/') continue

    // Skip nodes that already have a parent (external links and separators attached in applyMenuOrdering)
    if (node.parent) continue

    // Find parent path
    const segments = path.split('/').filter(Boolean)
    const parentPath = segments.length === 1
      ? '/'
      : '/' + segments.slice(0, -1).join('/')

    const parent = nodeMap.get(parentPath)
    if (parent) {
      node.parent = parent
      parent.children.push(node)
    } else {
      // Orphaned node, attach to root
      node.parent = root
      root.children.push(node)
    }
  }

  // Sort children by order
  sortTreeChildren(root)

  // Debug: Log root children order
  if (import.meta.dev) {
    console.log('[Tree] Root children after sorting:', root.children.map(n => ({
      title: n.title,
      order: n.order,
      isSeparator: n.isSeparator,
      isExternal: n.isExternal,
      externalUrl: n.externalUrl
    })))
  }

  return root
}

/**
 * Apply menu.yml ordering to nodes
 */
async function applyMenuOrdering(nodeMap: Map<string, TreeNode>, root: TreeNode) {
  // Get content domain from runtime config
  const config = useRuntimeConfig()
  const contentDomain = config.public.contentDomain || 'eternal'

  // Group nodes by parent directory to find which directories have menu.yml
  const dirGroups = new Map<string, TreeNode[]>()

  for (const [path, node] of nodeMap) {
    if (path === '/') continue

    const segments = path.split('/').filter(Boolean)
    const parentPath = segments.length === 1 ? '/' : '/' + segments.slice(0, -1).join('/')

    if (!dirGroups.has(parentPath)) {
      dirGroups.set(parentPath, [])
    }
    dirGroups.get(parentPath)!.push(node)
  }

  // Read menu.yml for each directory
  for (const [dirPath, nodes] of dirGroups) {
    try {
      const menuPath = dirPath === '/'
        ? `/_menu.yml`
        : `${dirPath}/_menu.yml`

      // Try to fetch _menu.yml content from /public/ (static file)
      const menuContent = await $fetch<string>(menuPath, {
        parseResponse: txt => txt,
        headers: { 'Accept': 'text/yaml, text/plain' }
      }).catch(() => null)

      const orderedNodes = new Set<TreeNode>()

      if (menuContent) {
        // Parse YAML manually (simple key: value format)
        const menuLines = menuContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'))
        let order = 0

        if (import.meta.dev && dirPath === '/') {
          console.log(`[Menu] Parsing ${menuLines.length} lines from _menu.yml`)
        }

        for (const line of menuLines) {
          const colonIndex = line.indexOf(':')
          if (colonIndex === -1) continue

          const key = line.substring(0, colonIndex).trim().replace(/^['"]|['"]$/g, '')
          const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '')

          if (import.meta.dev && dirPath === '/') {
            console.log(`[Menu] Parsing line - key: "${key}", value: "${value}"`)
          }

          let node: TreeNode | undefined

          // Determine node resolution based on value
          if (value.includes('---')) {
            // Separator - create non-clickable divider node
            // Use dirPath as the separator's path so it can be properly placed in the tree
            const separatorPath = dirPath === '/' ? `/__separator-${key}` : `${dirPath}/__separator-${key}`
            const parent = nodeMap.get(dirPath) || root
            node = {
              id: `separator-${key}`,
              title: '---',
              path: separatorPath,
              order: order++,
              children: [],
              isSeparator: true,
              parent: parent
            }
            nodeMap.set(separatorPath, node)
            parent.children.push(node)
            orderedNodes.add(node)
            if (import.meta.dev) {
              console.log(`[Menu] Created separator: id="${node.id}", path="${separatorPath}", order=${node.order}`)
            }
            continue
          } else if (value.startsWith('http://') || value.startsWith('https://')) {
            // External URL - create new node
            const parent = nodeMap.get(dirPath) || root
            node = {
              id: key,
              title: key,
              path: value,
              order: order++,
              children: [],
              externalUrl: value,
              isExternal: true,
              parent: parent
            }
            nodeMap.set(value, node)
            parent.children.push(node)
            orderedNodes.add(node)
            if (import.meta.dev) {
              console.log(`[Menu] Created external link: id="${node.id}", title="${node.title}", url="${value}", order=${node.order}, parent="${parent.path}"`)
              console.log(`[Menu] Parent has ${parent.children.length} children after adding external link`)
            }
            continue
          } else if (value.startsWith('/')) {
            // Absolute path
            node = nodeMap.get(value)
          } else if (value === '.' || value.startsWith('./')) {
            // Relative path
            const resolvedPath = value === '.'
              ? (dirPath === '/' ? `/${key}` : `${dirPath}/${key}`)
              : (dirPath === '/' ? `/${value.substring(2)}` : `${dirPath}/${value.substring(2)}`)
            node = nodeMap.get(resolvedPath)

            // Debug: Log resolution attempts
            if (!node && import.meta.dev) {
              console.log(`[Menu] Failed to find node for "${key}": tried path "${resolvedPath}", dirPath="${dirPath}"`)
              console.log(`[Menu] Available paths in nodeMap:`, Array.from(nodeMap.keys()).filter(p => p.includes(key)))
            }
          } else if (!value || value === key) {
            // Legacy format or empty value: slug.md in same directory
            node = nodes.find(n => n.id === key || n.path.endsWith(`/${key}`))
          }

          if (node) {
            node.order = order++
            orderedNodes.add(node)
            if (import.meta.dev) {
              console.log(`[Menu] Set order ${node.order} for "${node.title}" (id: ${node.id})`)
            }
          } else if (import.meta.dev) {
            console.warn(`[Menu] Could not resolve menu entry: ${key}: ${value}`)
          }
        }
      }

      // Debug: Log all nodes in this directory
      if (import.meta.dev && dirPath === '/') {
        console.log(`[Menu] Nodes in "${dirPath}":`, nodes.map(n => ({ title: n.title, order: n.order, isSeparator: n.isSeparator })))
        console.log(`[Menu] Ordered nodes:`, Array.from(orderedNodes).map(n => ({ title: n.title, order: n.order, isSeparator: n.isSeparator })))
      }

      // Add unlisted nodes alphabetically at the end
      const unlistedNodes = nodes.filter(n => !orderedNodes.has(n) && !n.isExternal)
      if (unlistedNodes.length > 0) {
        unlistedNodes.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
        let unlistedOrder = orderedNodes.size > 0 ? orderedNodes.size : 0
        for (const node of unlistedNodes) {
          node.order = unlistedOrder++
        }
      }
    } catch (error) {
      // Menu file doesn't exist - sort all nodes alphabetically
      nodes.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
      nodes.forEach((node, index) => {
        node.order = index
      })
    }
  }
}

/**
 * Recursively sort tree children by order
 */
function sortTreeChildren(node: TreeNode) {
  node.children.sort((a, b) => a.order - b.order)
  for (const child of node.children) {
    sortTreeChildren(child)
  }
}
