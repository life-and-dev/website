# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Multi-Domain Content Website - Project Documentation

This is a Nuxt 4 static site generator project that converts Grav CMS content to modern Vue.js websites with **multi-domain support**.

## Project Overview

Migrates content from a Grav-based website (located at `../eternal`) to statically generated Nuxt 4 websites with Vuetify for UI.

**Multi-Domain Architecture:** Single codebase supports multiple domains (son.ofgod.info, kingdom.ofgod.info, church.ofgod.info, ofgod.info) with environment-based content selection via `CONTENT` env var.

### Key Technologies
- **Nuxt 4** - Vue.js framework for SSG (Static Site Generation)
- **Vue 3** - Progressive JavaScript framework
- **Vuetify 3** - Material Design component framework
- **@nuxt/content v3** - SQL-based content system with WASM SQLite
- **TypeScript** - Type-safe development
- **Chokidar v4** - File watcher for image synchronization

## Architecture Decisions

### Standard YAML Parser Migration (2025-10-23)
**Problem:** Custom YAML parser was complex, hard to maintain, and didn't follow industry standards. Menu format conventions were unclear.

**Solution:** Migrated to standard `yaml` npm package with simplified, industry-standard menu format conventions.

**New Menu Format:**

1. **Lookup H1 from Markdown** (filename-based):
```yaml
- my-page              # String → lookup H1 from my-page.md
- parent:              # Array → lookup H1 from parent.md
  - child              # → lookup H1 from parent/child.md
```

2. **Custom Titles** (title-based):
```yaml
- Custom Title: path             # Link to path.md with custom title
- Home: /                        # Link to index.md with title "Home"
- External: https://example.com  # External link
```

3. **Separators & Headers**:
```yaml
- ===                 # Separator (horizontal line)
- Section Name: ===   # Header/title (non-clickable)
```

**Implementation:**
- [useNavigationTree.ts](app/composables/useNavigationTree.ts) - Uses `parse()` from `yaml` package
- [fetchMarkdownH1()](app/composables/useNavigationTree.ts#L500-L520) - Fetches and extracts H1 titles from markdown files
- [migrate-menu-format.ts](scripts/migrate-menu-format.ts) - Migration script to convert old format to new standard

**Migration Command:**
```bash
npm run migrate:menu-format              # Migrate all domains
npm run migrate:menu-format -- --dry-run # Preview changes
```

**Benefits:**
- ✅ Industry-standard YAML format
- ✅ Better editor support & validation
- ✅ Simpler, more maintainable code
- ✅ Clear separation: filename vs. custom title
- ✅ H1 titles automatically synced from markdown files

### Cloudflare Pages Static Site Routing (2025-10-17)
**Problem:** Direct page access like `https://word.ofgod.info/downloads` returned 404 errors. Pages would load initially but then Nuxt's client-side JavaScript showed 404 after a few milliseconds. Cloudflare Pages also cached the invalid `/* /404.html 404` redirect from previous deployments.

**Root Cause:** The `cloudflare-pages-static` preset is designed for hybrid apps with Functions, not pure SSG sites. It auto-generates SPA fallback behavior that interferes with static HTML serving. Additionally, Cloudflare Pages caches redirect rules from previous deployments.

**Solution:** Use Nitro's generic `static` preset with explicit prerender routes. Include an **empty `_redirects` file** to override Cloudflare's cached redirect rules.

**Configuration:**
```typescript
// nuxt.config.ts
nitro: {
  preset: 'static'  // Pure static preset - no SPA fallbacks
}
```

**Files Created:**
- [public/_redirects](public/_redirects) - Empty file to override cached Cloudflare redirect rules
- Updated [scripts/watch-images.ts](scripts/watch-images.ts#L12) - Added `_redirects` to STATIC_FILES preservation list

**Files Removed:**
- `/public/_routes.json` - NOT needed for pure static sites (deleted)

**How It Works:**
- Generic `static` preset builds pure static HTML without platform-specific SPA fallbacks
- Explicit route list ensures all pages are prerendered (no client-side 404)
- Empty `_redirects` file tells Cloudflare: "No redirect rules - use defaults"
- Cloudflare Pages automatically:
  - Serves existing HTML files → 200 OK
  - Shows custom /404.html for missing files → 404 Not Found
  - Redirects `/downloads` → `/downloads/` → 308 Permanent Redirect (trailing slash normalization)

**Output Location:** `.output/public/` (not `dist/`)

**Testing:**
```bash
CONTENT=word npm run generate
cat .output/public/_redirects
# Should show: "# No redirects - let Cloudflare serve static files directly"
npx wrangler pages dev .output/public
# ✨ Parsed 0 valid redirect rules. (No invalid rules!)
# Test: python3 -m http.server 8790
# curl -I http://localhost:8790/downloads → 301 → /downloads/ → 200 OK ✅
```

**Result:** Direct page access works perfectly. Empty `_redirects` overrides cached rules. No invalid redirects, no client-side 404, pure static HTML serving.

### Environment Variable Loading Fix (2025-10-15)
**Problem:** `CONTENT=ofgod npm run dev` defaulted to `eternal` directory. Command-line env vars were ignored.

**Root Cause:** ES module top-level code runs at import time, capturing `process.env.CONTENT` before Nuxt loads `.env` or applies command-line overrides.

**Solution:** Refactored to read `process.env.CONTENT` at runtime (inside functions), not at import time:
```typescript
// ❌ WRONG - Captured at import time
const contentDomain = process.env.CONTENT || 'ofgod'
const sourceDir = path.resolve('content', contentDomain)

// ✅ CORRECT - Read at runtime
function getContentDomain(): string {
  return process.env.CONTENT || 'ofgod'
}
function getSourceDir(): string {
  return path.resolve('content', getContentDomain())
}
```

**Changes:**
- [scripts/watch-images.ts](scripts/watch-images.ts) - Moved env var reads into `getContentDomain()`, `getSourceDir()`, `getTargetDir()` functions
- [content.config.ts](content.config.ts) - Added fallback: `process.env.CONTENT || 'ofgod'`
- [.env](.env) - Updated default from `kingdom` to `ofgod`, removed non-existent `eternal` references

**Result:** Command-line overrides like `CONTENT=church npm run dev` now work correctly.

### BibleHub Interlinear Links (2025-10-15)
**Problem:** Bible verse tooltips only linked to BibleGateway. Users needed access to BibleHub's interlinear translation.

**Solution:** Added second link in tooltip that generates BibleHub interlinear URLs from Bible references.

**Implementation:**
```typescript
// bible-verse-utils.ts - URL generator
export function createBibleHubInterlinearUrl(reference: string): string {
  const match = reference.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+))?/)
  if (!match || !match[1] || !match[2]) return 'https://biblehub.com/interlinear/'

  const [, book, chapter, verse] = match
  const bookSlug = book.toLowerCase().replace(/\s+/g, '_')

  return verse
    ? `https://biblehub.com/interlinear/${bookSlug}/${chapter}-${verse}.htm`
    : `https://biblehub.com/interlinear/${bookSlug}/${chapter}.htm`
}
```

**Tooltip HTML:**
- Added "Interlinear" link next to "Read Full Context"
- Uses Material Design translate icon (A with character symbols)
- Flexbox layout with `gap: 0.75rem`, wraps on mobile
- Opens in new tab with `rel="noopener noreferrer"`

**URL Format:**
- Verse: `biblehub.com/interlinear/john/3-16.htm`
- Chapter: `biblehub.com/interlinear/psalm/23.htm`
- Handles spaces: `1 Corinthians` → `1_corinthians`

**Testing:** 15 unit tests in [bible-verse-utils.test.ts](app/utils/bible-verse-utils.test.ts)

**Result:** Users can access original Greek/Hebrew interlinear translations directly from verse tooltips.

### Layout & Styling (2025-10-12 to 2025-10-13)
**Key Decisions:**
- **VNavigationDrawer**: Use Vuetify components with `position: fixed !important` CSS override for MD3 styling + sticky behavior
- **Layout**: Standard page scrolling, sidebars slide in/out with `transform: translateX`, no smart-scroll complexity
- **MD3 Inputs**: `VTextField` defaults set to `rounded="pill"` in `nuxt.config.ts` for semi-circular ends
- **Background Colors**: Force `bg-surface-rail` on mobile expansion panels for consistency

### Draft Content Exclusion System (2025-10-09)
**Problem:** Unpublished content (`published: false`) needed to be excluded from builds/navigation but kept in repository for future publication.

**Solution:** `.draft.md` file extension with intelligent image handling:
- **Migration**: Files with `published: false` → renamed to `*.draft.md`
- **Content Config**: `exclude: ['**/*.draft.md']` in `content.config.ts`
- **Image Naming**: Draft page images named WITHOUT `.draft` (e.g., `constantine.draft.md` → `constantine.pic.jpg`)
- **Image Exclusion**: Draft-only images stay in `/content/` but NOT copied to `/public/`

**Implementation:**
```typescript
// content.config.ts
source: {
  exclude: ['**/*.draft.md'],  // Must be array (not string)
  prefix: '/'  // Required for proper path generation
}

// scripts/watch-images.ts
async function isDraftOnlyImage(imagePath: string): Promise<boolean> {
  const prefix = fileName.split('.')[0]  // Extract page prefix
  const hasPublished = await fs.pathExists(`${prefix}.md`)
  const hasDraft = await fs.pathExists(`${prefix}.draft.md`)
  return !hasPublished && hasDraft  // Skip if only draft exists
}
```

**Result:**
- Published content: Visible in navigation, images copied to `/public/`
- Draft content: Excluded from builds, images stay in `/content/` only
- Clean separation: No draft leakage to production

### Image & Menu Synchronization (2025-10-08 to 2025-10-09)
**Implementation** (`scripts/watch-images.ts`):
- Auto-copies images and `_menu.yml` from `/content/{domain}/` to `/public/` (strips domain prefix)
- Filters draft-only images (checks if published `{page}.md` exists)
- Synchronous copy on startup ensures files ready before Nuxt serves requests
- Watches for changes with 500ms stability threshold

### Markdown Link Format (2025-10-08)
**Solution:** Store links WITH `.md` in markdown files (works in VS Code), ProseA component strips `.md` at render time (works in browser).

### Grav Migration (2025-10-08)
**Script** (`scripts/migrate-grav.ts`):
- Converts Grav pages to markdown with H1 titles
- Smart image naming: `{page}.{image}.{ext}` (prevents duplication)
- Generates `_menu.yml` from Grav folder numbering
- Converts internal links to `.md` format
- Usage: `npm run migrate -- --section=04.kingdom --domain=kingdom`

### Navigation & Content System (2025-10-07)
**Tree Navigation:**
- Desktop 3-column (280px nav + content + 240px TOC), mobile drawer
- Breadcrumbs (last 3 segments), auto-expanding tree, H2-H3 TOC (min 2 headings)
- Key composables: `useBreadcrumbs`, `useNavigationTree`, `useTableOfContents`

**@nuxt/content v3:**
- SQL-based content system with WASM SQLite
- Dynamic `cwd` via `CONTENT` env var for multi-domain support

**Bible Verse Tooltips:**
- Client-side plugin detects plain text (e.g., `John 3:16 (ESV)`)
- Whitelist-based (66 Bible books), shorthand expansion (`John 14:16,26`)
- Tooltip with verse text + links to BibleGateway & BibleHub interlinear

### Frontmatter-Free Markdown (2025-10-09)
**Solution:** H1-based titles (first `# Title` becomes page title), `.draft.md` extensions for unpublished content. TOC always skips H1, shows H2-H3 only.

### Navigation Menu Loading State Lock (2025-10-19)
**Problem:** The `_menu.yml` file was being fetched **twice** on initial page load, wasting bandwidth and causing duplicate processing.

**Root Cause:** The layout renders both desktop and mobile `<AppNavigation>` components. Both components call `loadTree()` in their `onMounted()` hooks, and both mount at nearly the same time. This created a race condition:
1. Desktop component mounts → checks cache (null) → starts fetching
2. Mobile component mounts (microseconds later) → checks cache (still null) → starts fetching
3. Result: Two simultaneous HTTP requests for the same `_menu.yml` file

**Solution:** Use shared loading state with `useState` to prevent concurrent fetches:

```typescript
// ❌ WRONG - Each component has separate loading state
const isLoading = ref(false)

// ✅ CORRECT - Shared loading state across all components
const isLoading = useState<boolean>('navigation-tree-loading', () => false)

async function loadTree() {
  // Guard: Skip if already loaded OR currently loading
  if (tree.value !== null || isLoading.value) {
    return
  }
  // ... fetch logic
}
```

**Implementation:**
- [useNavigationTree.ts:23](app/composables/useNavigationTree.ts#L23) - Changed `isLoading` from `ref` to `useState` with unique key
- [useNavigationTree.ts:32](app/composables/useNavigationTree.ts#L32) - Added `|| isLoading.value` to cache check

**How It Works:**
1. First component mounts → sets `isLoading.value = true` → starts fetch
2. Second component mounts → sees `isLoading.value = true` → returns early (no fetch)
3. First fetch completes → sets `tree.value` and `isLoading.value = false`
4. Both components share the same cached tree via `useState`

**Result:** Only **1 HTTP request** for `/_menu.yml` on initial page load, down from 2. Subsequent navigations: 0 requests (tree cached).

### Navigation Menu Expansion Reactivity Fix (2025-10-19)
**Problem:** Submenu nodes (e.g., Trinity) wouldn't expand when clicking the chevron button. The `expandedIds` Set was being mutated but Vue wasn't detecting the changes.

**Root Cause:** Vue 3's reactivity system uses Proxy-based tracking. When using `Set.add()` or `Set.delete()` methods on a reactive ref, Vue doesn't detect these mutations because Set methods mutate internal state without triggering the reactive proxy's setter.

**Solution:** Force Vue to detect Set changes by creating a new Set instance after every mutation:

```typescript
// ❌ WRONG - Vue won't detect this change
expandedIds.value.add(nodeId)

// ✅ CORRECT - Creating new Set triggers Vue's reactive setter
expandedIds.value.add(nodeId)
expandedIds.value = new Set(expandedIds.value)
```

**Implementation:**
- [NavigationTree.vue:84-118](app/components/NavigationTree.vue#L84-L118) - Added `new Set()` reassignment in `handleToggle()` after both expand and collapse operations
- [NavigationTree.vue:50-65](app/components/NavigationTree.vue#L50-L65) - Added `new Set()` reassignment in `expandPathToActive()` after auto-expanding ancestors

**How It Works:**
1. User clicks chevron → `handleToggle(nodeId)` is called
2. Function mutates Set: `expandedIds.value.add(nodeId)`
3. Reassign with new Set: `expandedIds.value = new Set(expandedIds.value)`
4. Vue detects ref assignment → triggers reactive updates
5. TreeNode components re-render with updated `isExpanded` computed

**Result:** Menu expansion/collapse works correctly. This is a standard Vue 3 pattern for working with Sets and Maps in reactive refs.

### Primary vs Alias Menu Items (2025-10-19)
**Problem:** Multiple menu items could link to the same page (e.g., "Trinity" as parent node, "The Son" linking to `/`). Which item should be highlighted when navigating to that page?

**Solution:** Distinguish between **primary** menu items (actual page locations) and **aliases** (custom-titled shortcuts). Only primary items can be highlighted.

**Implementation:**
```typescript
// TreeNode interface - isPrimary flag
export interface TreeNode {
  id: string
  title: string
  path: string
  isPrimary?: boolean  // Only true for string/array syntax items
  // ...
}

// Mark primary items during menu processing
if (typeof item === 'string') {
  node.isPrimary = true  // String syntax: - trinity
}
if (Array.isArray(value)) {
  submenuNode.isPrimary = true  // Array syntax: - trinity:
}
if (typeof value === 'string') {
  linkNode.isPrimary = false  // Alias: - 'The Son': /
}

// Only highlight primary items
const isActive = computed(() => {
  return props.node.isPrimary === true && props.node.path === props.activePath
})
```

**Rules:**
- **Primary items** (`- trinity` or `- trinity:`) → Can be highlighted when active
- **Alias items** (`- 'The Son': /`) → Never highlighted, just navigation shortcuts
- **Homepage** (`/`) → Collapses all menus, highlights nothing

**Files Changed:**
- [useNavigationTree.ts](app/composables/useNavigationTree.ts) - Added `isPrimary` flag, marking logic, `findPrimaryNodeByPath()` helper
- [TreeNode.vue](app/components/TreeNode.vue) - Updated `isActive` computed to check `isPrimary`
- [NavigationTree.vue](app/components/NavigationTree.vue) - Added homepage special case (collapse all menus)

**Result:** Clear distinction prevents ambiguity when multiple menu items point to the same page. Only the primary location gets highlighted.

### Navigation Menu Cache & YAML Parser Fixes (2025-10-20)
**Problem:** Menu items appeared in wrong order, separators didn't render, and wrong page titles displayed (e.g., "Terms" instead of "Tithing"). Issues persisted even after forced cache reset.

**Root Causes:**
1. **YAML Parser Bug**: Parser only recognized `- ` (dash with space) for separators, not `-` (dash alone)
2. **Stale Cache**: Navigation tree cached indefinitely with old menu structure using `useState('navigation-tree')` - changes to `_menu.yml` weren't picked up

**Solution:**
1. **YAML Parser Fix** - Handle both separator formats:
```typescript
// parseYamlMenu() - Handle bare `-` separator
if (trimmed === '-') {
  currentArray.push(null)  // Separator
  continue
}
// Then handle `- ` with content
if (trimmed.startsWith('- ')) {
  const content = trimmed.substring(2).trim()
  // ...
}
```

2. **Hourly Cache Expiration** - Auto-invalidate cache every hour:
```typescript
// Generate cache key that changes hourly
function getCacheKey(): string {
  const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60))
  return `navigation-tree-${hourTimestamp}`
}

// Use dynamic cache key
const tree = useState<TreeNode | null>(getCacheKey(), () => null)
const isLoading = useState<boolean>(`${getCacheKey()}-loading`, () => false)
```

**Implementation:**
- [useNavigationTree.ts:17-25](app/composables/useNavigationTree.ts#L17-L25) - Added `getCacheKey()` function for hourly cache keys
- [useNavigationTree.ts:499-514](app/composables/useNavigationTree.ts#L499-L514) - Fixed YAML parser to handle both `-` and `- ` separator formats
- [useNavigationTree.ts:33-35](app/composables/useNavigationTree.ts#L33-L35) - Updated `useState` calls to use hourly cache keys

**How It Works:**
- Cache key changes every 60 minutes (e.g., `navigation-tree-501234` → `navigation-tree-501235`)
- When hour changes: cache miss → tree rebuilds with latest `_menu.yml`
- Within same hour: cache hit → no rebuild, optimal performance
- Old cached trees automatically garbage collected by Vue/Nuxt

**Result:**
✅ Menu separators render correctly (both `-` and `- ` work)
✅ Menu items appear in exact `_menu.yml` order
✅ Correct page titles display
✅ Menu changes automatically picked up within 1 hour
✅ No manual cache clearing needed

### Hierarchical Menu System (2025-10-19)
**Problem:** Menu files were scattered across subdirectories (`/content/{domain}/**/_menu.yml`), making it hard to visualize and maintain the full navigation structure.

**Solution:** Consolidated to **single `_menu.yml` per domain** with nested YAML array syntax supporting headers, separators, submenus, and all path types.

**Format (`/content/{domain}/_menu.yml`):**
```yaml
- trinity:                              # Array → lookup H1 from trinity.md (has children)
  - abraham-3-visitors                  # String → lookup H1 from trinity/abraham-3-visitors.md
  - Members of the Trinity: ===         # Header (non-clickable, uses key as title)
  - The Father: https://ofgod.info      # External link (custom title)
  - The Son: /                          # Custom title → link to /index.md
  - holy-spirit                         # String → lookup H1 from trinity/holy-spirit.md
- ===                                   # Separator marker
- about                                 # String → lookup H1 from about.md
- disclaimer                            # String → lookup H1 from disclaimer.md
- edit                                  # String → lookup H1 from edit.md
```

**Path Resolution Examples:**
```yaml
- page                  # String → lookup H1 from /page.md
- ./sub/page            # Current dir: /sub/page.md
- /about                # Absolute: /about.md
- folder:               # Array → lookup H1 from /folder.md (has children)
  - child               # Relative to /folder: /folder/child.md
  - ../sibling          # Parent dir: /sibling.md
  - /root-page          # Absolute: /root-page.md
```

**Note:** Avoid circular references (e.g., adding `/` as a child of a submenu).

**Syntax Rules:**
- **String**: `- trinity` → Lookup H1 from `trinity.md` (primary item, can have children if followed by indent)
- **String**: `- ===` → Horizontal separator divider
- **Array (colon)**: `- trinity:` → Lookup H1 from `trinity.md` (has children below)
- **Object**: `- 'Custom Title': path` → Use custom title, link to `path.md` (never expandable)
- **Object**: `- 'Header Text': ===` → Non-clickable section header
- **Relative paths**: `../edit` (parent), `./page` (current), `/page` (root)
- **External URLs**: `https://...` → Opens in new tab with icon

**Implementation:**
- [useNavigationTree.ts](app/composables/useNavigationTree.ts) - Uses standard `yaml` package parser
  - `parse()` from `yaml` package - Industry-standard YAML parsing
  - `fetchMarkdownH1()` - Fetches markdown files and extracts H1 titles
  - `processMenuItems()` - Async recursive processing with H1 lookups
  - `resolvePath()` - Handles `../`, `./`, and `/` path resolution
  - **Performance**: Uses `useState` for SSR caching - menu built once, reused for all navigations
  - Menu only fetched on initial page load, then cached in Nuxt payload
- [TreeNode.vue](app/components/TreeNode.vue#L9-L16) - Header rendering (uppercase, secondary color, non-clickable)
- [watch-images.ts](scripts/watch-images.ts#L85-L90) - Only watches root `_menu.yml` (not subdirectories)
- [migrate-menu-format.ts](scripts/migrate-menu-format.ts) - Migration utility to convert to standard format

**Performance Optimization (2025-10-19):**
- Menu tree built **once** on initial page load
- Navigation tree cached in `useState` - shared across all components
- Loading state lock prevents duplicate fetches when both desktop/mobile navigation components mount
- Initial load: **1 HTTP request** for `/_menu.yml`
- Subsequent navigations: **0 HTTP requests** (tree cached in memory)
- Tree serialized in SSR payload and hydrated on client

**Menu Format Migration:**
```bash
# Convert menu files to standard YAML format
npm run migrate:menu-format              # Migrate all domains
npm run migrate:menu-format -- --dry-run # Preview changes first
npm run migrate:menu-format -- --domain=son  # Migrate specific domain

# Review generated menu
cat content/son/_menu.yml

# Test navigation
CONTENT=son npm run dev
```

**Visual Features:**
- **Headers**: Uppercase, small font, secondary color, non-clickable
- **Separators**: Horizontal dividers between menu sections
- **External Links**: Show `mdi-open-in-new` icon
- **Submenus**: Expand/collapse with chevron, auto-expand to active page

**Benefits:**
- ✅ Single source of truth per domain
- ✅ Full structure visible at once
- ✅ Headers to organize sections
- ✅ All path types supported
- ✅ DRY principle compliance
- ✅ Industry-standard YAML format
- ✅ H1 titles automatically synced from markdown files

**Result:** Cleaner, more maintainable navigation with enhanced organizational features and automatic title synchronization.

### SEO & Tooltips (2025-10-10)
**Features:**
- Optional `description` frontmatter → `<meta name="description">` + navigation/search tooltips
- Responsive tooltip positioning (right on desktop, bottom on mobile)
- Standard HTML5 SEO tags (`canonical`, `lang="en"`, `robots`)

### Search Relevance Ranking (2025-10-10)
**Scoring System:**
- Field weights: Title (10) > Keywords (7) > Description (3) > Excerpt (1)
- Match quality: Exact (×3) > StartsWith (×2) > Contains (×1)
- Bonuses: Position (+2), Multi-field (+3)
- Penalties: Path depth (-1 per level beyond root)

### TOC Post-Render Processing (2025-10-17)
**Problem:** Table of Contents appeared on initial load but disappeared after navigating to other pages.

**Root Cause:** Layout's `watch(route.path)` cleared TOC AFTER page component had already generated it. Race condition between parent layout and child page components.

**Solution:** Use Vue's standard `onUpdated()` lifecycle hook in page components. Remove conflicting layout watch.

**Implementation:**
```typescript
// app/composables/useContentPostProcessing.ts
export function useContentPostProcessing(pageRef: Ref<any>) {
  const processedPageId = ref<string | null>(null)

  // Reset flag when new data arrives
  watch(pageRef, () => { processedPageId.value = null }, { immediate: true })

  // Process after ContentRenderer finishes rendering
  onUpdated(() => {
    nextTick(() => {
      if (processedPageId.value === pageId) return  // Guard: prevent duplicates
      processedPageId.value = pageId
      $bibleTooltips.scan()
      layoutGenerateTOC()  // useTableOfContents handles < 2 headings check
    })
  })

  // Handle initial mount
  onMounted(() => { nextTick(() => processContent()) })
}
```

**Key Points:**
- `onUpdated()` fires after ContentRenderer completes (standard Vue pattern)
- `nextTick()` ensures DOM updates are fully committed
- Guard flag prevents duplicate processing
- No timers, MutationObservers, or template refs needed
- Layout no longer clears TOC (caused race condition)

**Result:** TOC appears reliably on both initial load and navigation.

### Bolls.life Bible API Integration (2025-10-17)
**Problem:** Users requested ESV and NKJV translation support for Bible verse tooltips. Initial attempt used bible-api.com which lacks these copyrighted translations.

**Solution:** Migrated to Bolls.life API which provides 100+ translations including ESV and NKJV at no cost.

**API Format:**
Bolls.life requires **standard book numbering (1-66)** instead of book names:
```typescript
// Single verse: https://bolls.life/get-verse/{TRANSLATION}/{BOOK}/{CHAPTER}/{VERSE}/
https://bolls.life/get-verse/ESV/43/3/16/  // John 3:16 (ESV)

// Verse range: Fetch chapter, filter verses
https://bolls.life/get-text/NKJV/43/3/  // John chapter 3 → filter verses 16-18
```

**Book Number Mapping:**
```typescript
// app/utils/bible-verse-utils.ts - getBookNumber()
Genesis=1, Exodus=2, ... John=43, Romans=45, ... Revelation=66

// Supports abbreviations:
'john' → 43, 'jn' → 43, 'joh' → 43
'1 corinthians' → 46, '1cor' → 46, '1co' → 46
```

**Implementation:**
- [bible-verse-utils.ts](app/utils/bible-verse-utils.ts) - Added `getBookNumber()`, `processBollsVerse()`, `processBollsVerseRange()`
- [bible-tooltips.client.ts](app/plugins/bible-tooltips.client.ts#L54-L128) - Parse reference → book number → Bolls.life API
- HTML stripping: Removes `<S>` Strong's numbers, `<a>` cross-references, preserves `<i>` italic text

**Response Format:**
```json
{
  "pk": 1958205,
  "verse": 16,
  "text": "For God so loved the world, <i>that</i> he gave his only Son...",
  "comment": "<a href='/ESV/45/5/8'>Rom. 5:8</a>..."
}
```

**Features:**
- ✅ **ESV, NKJV, KJV, YLT, WEB** and 100+ translations
- ✅ **Verse ranges** - `John 3:16-18` fetches chapter, filters verses 16-18
- ✅ **No authentication** - Free, CORS-enabled
- ✅ **No rate limits** - No documented restrictions
- ✅ **HTML handling** - Strips tags for clean tooltip display

**User Experience:**
- Requested: `John 3:16 (ESV)` → Displays: `John 3:16 (ESV)` with actual ESV text ✅
- Requested: `Romans 8:28 (NKJV)` → Displays: `Romans 8:28 (NKJV)` with NKJV text ✅
- Requested: `Psalm 23:1-3 (KJV)` → Displays: `Psalm 23:1-3 (KJV)` with verses 1-3 ✅
- No translation specified → Defaults to ESV ✅

**Documentation:** https://bolls.life/api/

**Result:** Full ESV and NKJV support without fallbacks. Users get requested translations directly.

### Bible Tooltips CSS Extraction (2025-10-17)
**Problem:** Bible tooltip styles were embedded as inline styles in the plugin JavaScript, making them harder to maintain and violating the DRY principle.

**Solution:** Extracted all CSS to dedicated stylesheet [app/assets/css/bible-tooltips.css](app/assets/css/bible-tooltips.css).

**Implementation:**
- Created CSS file with classes: `.bible-tooltip`, `.bible-tooltip-overlay`, `.bible-tooltip-title`, `.bible-tooltip-translation`, `.bible-tooltip-text`, `.bible-tooltip-footer`, `.bible-tooltip-link`, `.bible-tooltip-icon`, `.bible-ref`
- Updated [bible-tooltips.client.ts](app/plugins/bible-tooltips.client.ts) to use CSS classes instead of inline styles
- Added CSS file to [nuxt.config.ts](nuxt.config.ts) `css` array for global loading
- Retained only dynamic inline styles for positioning (`left`, `top`) and visibility (`display`)

**CSS Structure:**
```css
/* Overlay - covers entire viewport when tooltip is locked */
.bible-tooltip-overlay { position: fixed; z-index: 9999; ... }

/* Tooltip container - uses theme CSS variables */
.bible-tooltip {
  background: rgb(var(--v-theme-surface-appbar));
  color: rgb(var(--v-theme-on-surface));
  ...
}

/* Semantic classes for content sections */
.bible-tooltip-title { font-weight: 600; ... }
.bible-tooltip-translation { color: rgb(var(--v-theme-secondary)); ... }
.bible-tooltip-footer { border-top: 1px solid rgb(var(--v-theme-outline)); ... }

/* Bible reference spans in content */
.bible-ref { color: rgb(var(--v-theme-primary)); text-decoration: underline; ... }
```

**Benefits:**
- Single source of truth for tooltip styling
- Easier to maintain and customize
- Better separation of concerns (structure vs. presentation)
- Theme variables properly referenced in CSS
- Reduced JavaScript bundle size

**Result:** Clean separation between static styles (CSS) and dynamic positioning (JavaScript).

### Bible Tooltips Scoping Fix (2025-10-23)
**Problem:** Bible verse parser was converting references to interactive tooltips throughout the entire page, including navigation menus, sidebars, breadcrumbs, and table of contents.

**Root Cause:** The `scan()` method in [bible-tooltips.client.ts](app/plugins/bible-tooltips.client.ts) defaulted to scanning `document.body` when no container was specified. The [useContentPostProcessing.ts](app/composables/useContentPostProcessing.ts) composable called `scan()` without parameters, causing the entire DOM to be processed.

**Solution:** Scope the Bible verse parser to only process content within the `.content-body` element (article content area).

**Implementation:**
```typescript
// bible-tooltips.client.ts - Accept optional container parameter
public scan(container?: HTMLElement) {
  this.detectBibleReferences(container)
}

// TypeScript declarations updated
interface NuxtApp {
  $bibleTooltips: {
    scan: (container?: HTMLElement) => void
  }
}

// useContentPostProcessing.ts - Pass article container
const contentContainer = document.querySelector('.content-body, article')
$bibleTooltips.scan(contentContainer as HTMLElement)
```

**Files Changed:**
- [bible-tooltips.client.ts:518](app/plugins/bible-tooltips.client.ts#L518) - Added optional `container` parameter to `scan()` method
- [bible-tooltips.client.ts:533](app/plugins/bible-tooltips.client.ts#L533) - Updated provider to pass container through
- [bible-tooltips.client.ts:541,549](app/plugins/bible-tooltips.client.ts#L541) - Updated TypeScript declarations for both modules
- [useContentPostProcessing.ts:43](app/composables/useContentPostProcessing.ts#L43) - Pass `.content-body` container to `scan()`

**Result:** Bible verse tooltips now only appear in markdown article content. Navigation menus, sidebars, breadcrumbs, and TOC are no longer processed for Bible references.

## Usage Instructions

### Setup
```bash
npm install

# Set content domain (defaults to 'ofgod')
export CONTENT=kingdom  # or add to .env file
```

### Development
```bash
npm run dev                    # Start dev server (watcher auto-starts)
CONTENT=kingdom npm run dev    # Use specific content domain
```

### Testing
```bash
npm test                       # Run all unit tests
npm test -- useSearchRelevance # Run search relevance tests
npm test -- bible-tooltips     # Run Bible reference parsing tests
```

### Building for Production
```bash
# Build for specific domain
CONTENT=son npm run generate      # → deploy to son.ofgod.info
CONTENT=kingdom npm run generate  # → deploy to kingdom.ofgod.info
CONTENT=church npm run generate   # → deploy to church.ofgod.info

# Preview production build
npm run preview
```

### Content Migration
```bash
# Migrate specific section with images
npm run migrate -- --section=04.kingdom --domain=kingdom

# Options
npm run migrate -- --dry-run      # Preview without writing
npm run migrate -- --test          # Migrate single page
npm run migrate -- --limit=10      # Limit to 10 pages
```

### Git Submodules
```bash
# Clone with submodules
git clone --recursive https://github.com/life-and-dev/website.git

# Initialize submodules (if cloned without --recursive)
git submodule init && git submodule update

# Update all submodules to latest
git submodule update --remote

# Check submodule status
git submodule status
```

## Production Deployment

### Cloudflare Pages Configuration

**IMPORTANT:** Set build output directory to `.output/public` (NOT `dist`)

1. Go to your Cloudflare Pages project → **Builds & deployments**
2. Set **Build output directory** to: `.output/public`
3. Set **Build command**: `CONTENT=<domain> npm run generate`
4. Set **Environment variable**: `CONTENT=<domain>`

**Why:** The `static` preset outputs to `.output/public/`, not `dist/`. Using `dist` causes: `Failed: build output directory contains links to files that can't be accessed`

### Build Commands Per Domain

```bash
# Build for each domain (run separately)
CONTENT=ofgod npm run generate    # → deploy to ofgod.info
CONTENT=kingdom npm run generate  # → deploy to kingdom.ofgod.info
CONTENT=church npm run generate   # → deploy to church.ofgod.info
CONTENT=son npm run generate      # → deploy to son.ofgod.info
CONTENT=word npm run generate     # → deploy to word.ofgod.info
```

**Output:** `.output/public/` contains the complete static site

### Hosting Options

- **Cloudflare Pages** (Recommended) - Native integration, global CDN
- **Netlify** - Set publish directory to `.output/public`
- **Vercel** - Set output directory to `.output/public`
- **GitHub Pages** - Deploy `.output/public` directory
- **Any static host** - Pure HTML/CSS/JS, no server required

**Important:** Each domain needs separate build with different `CONTENT` env var.

## Project Structure

```
/root/ofgod/
├── app/                             # Nuxt 4 app directory
│   ├── components/
│   │   ├── AppBar.vue              # Breadcrumbs, print, theme
│   │   ├── AppNavigation.vue       # Tree navigation + search
│   │   ├── AppTableOfContents.vue  # Right sidebar TOC
│   │   └── content/
│   │       ├── ProseA.vue            # Strips .md from links
│   │       ├── ProseBlockquote.vue   # Custom blockquote (VCard)
│   │       └── ProseTable.vue        # Renders tables as v-data-table
│   ├── composables/
│   │   ├── useBreadcrumbs.ts           # Generate breadcrumbs
│   │   ├── useNavigationTree.ts        # Build tree from pages
│   │   ├── useSearchRelevance.ts       # Search relevance scoring
│   │   ├── useSiteConfig.ts            # Multi-domain canonical URLs + GitHub config
│   │   ├── useGitHubEdit.ts            # Generate GitHub edit URLs
│   │   ├── useTableOfContents.ts       # Extract TOC from HTML
│   │   ├── useContentPostProcessing.ts # Post-render processing (Bible tooltips + TOC)
│   │   └── useTableParser.ts           # Parse HTML tables for v-data-table
│   ├── pages/
│   │   ├── index.vue               # Home (queries content)
│   │   └── [...slug].vue           # Dynamic pages
│   ├── plugins/
│   │   ├── bible-tooltips.client.ts # Bible reference detection
│   │   └── bible-tooltips.test.ts   # Unit tests
│   ├── types/
│   │   └── table.ts                 # Table interfaces (v-data-table)
│   └── utils/
│       ├── bible-verse-utils.ts     # Verse processing
│       └── bible-book-names.ts      # 66 Bible book whitelist
├── content/                         # Git submodules (separate repos)
│   ├── ofgod/                       # life-and-dev/ofgod submodule
│   ├── church/                      # life-and-dev/church submodule
│   ├── kingdom/                     # life-and-dev/kingdom submodule
│   ├── son/                         # life-and-dev/son submodule
│   └── word/                        # life-and-dev/word submodule
│       ├── _menu.yml                # Navigation menu config
│       ├── index.md                 # Domain root page
│       ├── page.md                  # Published page
│       ├── draft.draft.md           # Unpublished page
│       └── page.image.jpg           # Images co-located
├── public/                          # Auto-generated (gitignored)
│   ├── _menu.yml                    # Auto-copied from /content/ (root only)
│   ├── page.image.jpg               # Auto-copied from /content/
│   └── church/
│       └── image.jpg                # Domain prefix stripped
├── scripts/
│   ├── migrate-grav.ts              # Grav migration (pages + images + menus)
│   ├── copy-images.ts               # One-time copy (images + menus)
│   └── watch-images.ts              # File watcher (images + menus)
├── content.config.ts                # @nuxt/content multi-domain config
└── nuxt.config.ts                   # Nuxt config with watcher hook
```

## Markdown Format

**Files:** `page.md` or `page.draft.md` (unpublished)

**Structure:**
```markdown
# Page Title

First paragraph content...

## Section Heading

Content...
```

**Frontmatter (Optional):**
```yaml
---
description: Brief page description for SEO meta tags and navigation tooltips
---
```

**Navigation:** Controlled by `_menu.yml` files (see Menu-Based Navigation section)

**Description Usage:**
- Shows as tooltip when hovering navigation menu items (desktop: right, mobile: bottom)
- Shows as tooltip when hovering search results
- Included in HTML `<meta name="description">` for SEO/LLMs
- Optional field - pages without description work normally

## Troubleshooting

### Content Config Issues (2025-10-09)
**Problem:** No pages loading, navigation empty, content queries return nothing.

**Root Cause:** Invalid `content.config.ts` configuration (wrong data types).

**Solution:**
```typescript
// ❌ WRONG - exclude must be array, not string
exclude: '**/*.draft.md'

// ✅ CORRECT - array of glob patterns
exclude: ['**/*.draft.md']

// ❌ WRONG - missing prefix causes path issues
source: { cwd: '...', include: '**/*.md' }

// ✅ CORRECT - prefix required for navigation tree
source: { cwd: '...', include: '**/*.md', prefix: '/' }
```

**Symptoms:**
- Pages exist but don't appear in navigation
- All pages show as top-level (no hierarchy)
- Content queries return empty results

**Fix:** Clear cache and verify config:
```bash
rm -rf .nuxt .output
npm run dev
# Check console for errors
```

### CONTENT Environment Variable Not Working
**Fix:** Restart dev server, clear cache if switching domains: `rm -rf .nuxt .output`. Verify `.env` doesn't conflict with command-line value.

### Image Watcher Not Working
- Check Nuxt `ready` hook in `nuxt.config.ts` (import path must be `'./scripts/watch-images'` NOT `'./scripts/watch-images.js'`)
- Verify `CONTENT` env var is set correctly (see above)
- Check console for "📦 Copying images and menus from:" message
- Check console for "👀 Watching images and menus in:" message
- Restart dev server if watcher doesn't start
- Verify root menu copied: `ls /public/` should show `_menu.yml`
- Note: Only root `_menu.yml` is copied (subdirectory menus no longer used)

### Images Not Appearing (404 errors)
- Restart dev server (auto-copies on startup)
- Manual copy: `CONTENT=domain npx tsx scripts/copy-images.ts`
- Draft images (`*.draft.md`) don't copy to `/public/` (expected)
- Production: Run `npm run generate` (not `npm run build`)

### Links with .md Extensions in Generated HTML
- ProseA component strips `.md` at render time. Run `npm run generate` after changes.

### Migration Issues
- Use `--dry-run` to preview. Check output for `Internal Links` and `Migrated Images` counts.

### Content Not Loading
- Clear cache: `rm -rf .nuxt .output && npm run dev`

### TypeScript Errors / Hydration Mismatches
- Clear cache: `rm -rf .nuxt .output && npx nuxi prepare && npm run dev`

### TOC Not Appearing After Navigation
**Fix:** Use `onUpdated()` lifecycle hook in page components. See Architecture Decisions → TOC Post-Render Processing.

### Navigation Menu Not Expanding
**Fix:** Reassign Set/Map after mutations: `expandedIds.value = new Set(expandedIds.value)`. See Architecture Decisions → Navigation Menu Expansion Reactivity Fix.

## Coding Rules

### DRY Principle (Don't Repeat Yourself) - MANDATORY

**Definition:** Every piece of knowledge should have a single, unambiguous, authoritative representation within the system.

**Requirements:**
- Never duplicate code, data, logic, or configuration across multiple files
- Establish a single source of truth for each piece of information
- Changes should only require modification in ONE place

### CSS Unit Guidelines - MANDATORY

**Use `rem` units for all spacing and sizing** (padding, margin, border-radius, font-size, etc.)

**Exceptions - Use `px` only for:**
- **Sidebar widths** (e.g., `280px` for navigation drawer) - affected by screen width breakpoints
- **Border widths** (e.g., `1px` borders)
- **z-index values** (dimensionless)

**Rationale:**
- `rem` units scale with user font preferences (accessibility)
- Maintains consistent spacing across different screen sizes
- Prevents visual issues like backgrounds leaking outside rounded borders

**Conversion Reference:**
```css
/* Default: 1rem = 16px */
0.25rem = 4px   /* Small spacing */
0.5rem  = 8px   /* Medium spacing */
0.75rem = 12px  /* Large spacing */
1rem    = 16px  /* Standard spacing */
1.5rem  = 24px  /* Extra large */
1.75rem = 28px  /* Pill border radius */
```

**Examples:**
```css
/* ✅ CORRECT - Use rem */
.search-box {
  padding: 0.75rem;
  border-radius: 1.75rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

/* ❌ WRONG - Don't use px for spacing */
.search-box {
  padding: 12px;
  border-radius: 28px;
  margin-top: 8px;
}

/* ✅ CORRECT - Sidebar width uses px */
.v-navigation-drawer {
  width: 280px;
}

/* ✅ CORRECT - Border width uses px */
.card {
  border: 1px solid;
}
```

### Empty Types

- Use `undefined` for uninitialized fields
- Use `null` for deliberately empty initialized fields
- Use `''` (empty string) only for text fields where a value is always expected

### Enums

Never use TypeScript enums or union types (except Discriminated Unions). Prefer Const Assertions:

```ts
export const Status = {
  A_VALUE: 'A_VALUE',
  NEXT_VALUE: 'NEXT_VALUE',
} as const;
export type StatusEnum = keyof typeof Status;
```

Naming: UPPER_SNAKE_CASE for keys/values, PascalCase for type name.

### File Naming Convention

- kebab-case for URL/route files
- PascalCase for Vue components and models
- camelCase for other files
- Special extensions: `.config.ts`, `.d.ts`, `.schema.ts`, `.test.ts`
