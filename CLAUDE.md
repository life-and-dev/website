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

### Bible Verse Tooltip Hydration Fix (2025-10-27)
**Problem:** Bible verse tooltips caused hydration mismatch errors because client-side JavaScript was modifying the DOM during hydration. Server HTML contained plain text `Matthew 3:16`, but client-side plugin wrapped it in `<span class="bible-ref">`, creating different HTML structures.

**Root Cause:**
- Build time: Markdown rendered as plain text
- Runtime: Client plugin scanned DOM and wrapped Bible references in spans
- Vue detected different HTML between server and client → hydration mismatch

**Solution:** Use Nuxt Content's `content:file:beforeParse` hook to wrap Bible verses in spans BEFORE markdown is parsed, ensuring server and client HTML match perfectly.

**Implementation:**
```typescript
// nuxt.config.ts - Lines 59-115
hooks: {
  'content:file:beforeParse': (ctx) => {
    const { file } = ctx
    if (!file.id.endsWith('.md')) return

    const patterns = createBibleReferencePatterns()

    // Wrap each Bible reference in markdown
    patterns.forEach(pattern => {
      // Collect all matches (avoiding excluded contexts like code blocks, links)
      // Replace in reverse order to preserve indices
      const wrapped = `<span class="bible-ref" data-reference="${text}">${text}</span>`
      file.body = before + wrapped + after
    })
  }
}
```

**Key Details:**
- Hook receives `ctx` parameter with `file` property (not `file` directly)
- Use `file.id` not `file._id` to check file extension
- `file.body` is raw markdown string at this stage (before AST parsing)
- Modify string directly using regex patterns and replacement
- Exclude code blocks, links, and other special contexts

**Cache Management:**
- Nuxt Content caches parsed files in `.data/` directory
- Cached files skip the `beforeParse` hook entirely
- **Must delete `.data/` after adding/modifying hooks:** `rm -rf .data`
- Updated dev script to auto-clear cache: `"dev": "rm -rf .data && nuxt dev"`

**Development Workflow:**
```bash
npm run dev         # Clears .data cache, hook runs on all files
npm run dev:cached  # Keeps cache, faster startup (use when hook unchanged)
```

**Files Modified:**
- [nuxt.config.ts:59-115](nuxt.config.ts#L59-L115) - Added beforeParse hook
- [package.json:7](package.json#L7) - Updated dev script
- [.gitignore:3](.gitignore#L3) - .data/ already ignored

**Result:**
- ✅ Bible verses wrapped at build time in static HTML
- ✅ Server and client HTML match perfectly
- ✅ No hydration mismatch errors
- ✅ Tooltips attach to pre-existing spans via event listeners
- ✅ Works in both dev mode and production builds

**Why This Approach:**
- **Tried transformers first:** Nuxt Content v3 transformers don't run reliably (documented issue)
- **Hook is better:** Runs in both dev and build, simpler API, direct string manipulation
- **Build-time processing:** Prevents client-side DOM modification during hydration
- **Performance:** No runtime scanning needed, just attach event listeners

### CDN Fonts with Fallbacks for Bible Tooltips (2025-10-27)
**Problem:** Bible verse tooltip icons (book emoji `🕮` U+1F56E and Hebrew/Greek characters `אΩ`) failed to render on Android devices due to missing glyphs in the default system font. Users saw empty boxes instead of icons.

**Root Cause:** Android's default font (Roboto) doesn't include all Unicode emoji characters or Hebrew/Greek special symbols. The book emoji and Hebrew/Greek characters used in tooltips were missing from the font, causing rendering failures.

**Solution:** Use CDN fonts with fallbacks - Material Design Icons from CDN for the book icon, and Noto Sans font fallback for Hebrew/Greek characters `אΩ`.

**Implementation:**
```typescript
// bible-tooltips.client.ts - Line 187-188
// Book icon: Replace emoji with Material Design Icon
// BEFORE: <span style="font-size: 1.5em">🕮</span>
// AFTER:  <i class="mdi mdi-book-open-variant"></i>

// Hebrew/Greek: Keep original characters but add font fallback in CSS
// <span class="bible-tooltip-hebrew-greek">אΩ</span>
```

**Icon/Symbol Choices:**
- **Full Context link:** `mdi-book-open-variant` (Material Design Icon) - Represents reading Bible passages in full context
- **Interlinear link:** `אΩ` (Hebrew Aleph + Greek Omega) with Noto Sans fallback - Represents Hebrew/Greek original language study

**Files Modified:**
- [nuxt.config.ts:52-53](nuxt.config.ts#L52-L53) - Added CDN links for MDI and Noto Sans fonts
- [bible-tooltips.client.ts:187-188](app/plugins/bible-tooltips.client.ts#L187-L188) - Updated book icon to MDI, wrapped Hebrew/Greek in styled span
- [bible-tooltips.css:68-76](app/assets/css/bible-tooltips.css#L68-L76) - Added MDI icon sizing and Noto Sans fallback for Hebrew/Greek

**CDN Configuration:**
```typescript
// nuxt.config.ts - app.head.link
{ rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css' },
{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap' }
```

**CSS Fallback:**
```css
/* Material Design Icon sizing */
.bible-tooltip-link i.mdi {
  font-size: 1.25rem;
}

/* Noto Sans fallback for Hebrew/Greek */
.bible-tooltip-hebrew-greek {
  font-family: 'Noto Sans', sans-serif;
  font-size: 1.5em;
}
```

**Result:**
- ✅ Icons render correctly on all platforms including Android
- ✅ Consistent with Material Design aesthetic (matches Vuetify UI)
- ✅ CDN-hosted fonts with browser caching benefits
- ✅ Hebrew/Greek characters `אΩ` more semantically accurate than Chinese translation icon
- ✅ Noto Sans fallback ensures Hebrew/Greek characters render on all devices
- ✅ Proper semantic markup with `<i>` tags for icons and styled spans for text

**Why This Approach:**
- **CDN Benefits:** Browser caching, global CDN distribution, automatic updates
- **Font Fallbacks:** Noto Sans ensures Hebrew/Greek characters render on all platforms
- **Semantic Accuracy:** `אΩ` (Aleph-Omega) better represents Hebrew/Greek than `mdi-translate` (Chinese symbols)
- **Performance:** CDN fonts are cached across sites, reducing load times
- **Consistency:** MDI matches existing Vuetify UI (AppBar uses `mdi-menu`, `mdi-printer`, etc.)

### Menu Ordering & Alias Link Fixes (2025-10-24)
**Problem:** Menu items appeared in incorrect order when submenus were present. Alias links (e.g., `- 'The Son': ../nature`) didn't render when the target page was already listed elsewhere in the menu.

**Root Causes:**
1. **Order Counter Bug**: Line 461 in `processMenuItems()` assigned submenu's internal order counter to parent's counter, causing subsequent items to restart numbering from 0
2. **Alias Skip Bug**: Line 473 checked `!orderedNodes.has(node)` for alias links, preventing aliases to already-listed pages

**Example of Order Bug:**
```yaml
- nature                    # Got order 0 ✓
- temptations               # Got order 1 ✓
- son-as-god:               # Got order 2 ✓
  - john-1-18               # Got order 0 (within submenu) ✓
- The Son of God: /         # Got order 1 ✗ (should be 3!)
- son-of-man                # Got order 2 ✗ (should be 4!)
```

**Solution:**
```typescript
// Fix 1: Line 461 - Remove assignment to preserve parent's order counter
// BEFORE: order = await processMenuItems(...)
// AFTER:  await processMenuItems(...)

// Fix 2: Line 473 - Remove check that prevented alias creation
// BEFORE: if (node && !orderedNodes.has(node)) {
// AFTER:  if (node) {
```

**Implementation:**
- [useNavigationTree.ts:461](app/composables/useNavigationTree.ts#L461) - Removed `order =` assignment
- [useNavigationTree.ts:473](app/composables/useNavigationTree.ts#L473) - Removed `!orderedNodes.has(node)` check

**Why This Works:**
- Each menu level has independent order counters starting from 0
- Submenu children orders are relative to their parent node
- Parent's order counter continues independently (already incremented at line 452)
- Alias links create separate `linkNode` entities with unique IDs
- Multiple aliases to the same page are allowed and expected behavior

**Result:** Menu items render in exact `_menu.yml` order. Alias links appear correctly even when target page is already listed elsewhere.

### Menu Header Text Alignment Fix (2025-10-24)
**Problem:** Header text appeared 1.75rem to the left of regular menu item text at the same depth level, making headers look misaligned.

**Root Cause:** Regular menu items have a chevron/leaf-indicator (1.5rem width + 0.25rem margin-right = 1.75rem total) before the text. Headers had no such element, so their text started immediately at the `paddingLeft` edge.

**Solution:** Add 1.75rem offset to header padding to account for missing indicator space:
```vue
<!-- TreeNode.vue line 13 -->
:style="{ paddingLeft: `${depth * 1.25 + 1.75}rem` }"
```

**Result:** Header text aligns with regular menu item text at the same depth level.

### Menu Chevron Visibility Fix (2025-10-24)
**Problem:** Chevron icon (expand/collapse arrow) became invisible when parent menu item was selected, blending with the active background color.

**Root Cause:** Vuetify `v-icon` component has scoped styles that need `:deep()` selector to override from parent component.

**Solution:** Use `:deep()` to target icon within Vuetify button component:
```css
/* TreeNode.vue line 201-203 */
.tree-node.is-active :deep(.chevron-button .v-icon) {
  color: rgb(var(--v-theme-on-selected));
}
```

**Result:** Chevron icon visible on selected menu items, matches text color.

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
- **Nested Blockquotes** (2025-10-24): Styled with visual hierarchy - indented 1rem, primary-colored left border, transparent background, reduced padding. Print CSS uses solid black border. Defined in [markdown.css](app/assets/css/markdown.css) and [print.css](app/assets/css/print.css)

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
**Problem:** `_menu.yml` fetched twice on page load (desktop + mobile components mount simultaneously).

**Solution:** Shared loading state via `useState` prevents race condition:
```typescript
const isLoading = useState<boolean>('navigation-tree-loading', () => false)
if (tree.value !== null || isLoading.value) return  // Guard
```

**Result:** 1 HTTP request on initial load, 0 on subsequent navigations.

### Navigation Menu Expansion Reactivity Fix (2025-10-19)
**Problem:** Submenu expand/collapse didn't work (Vue 3 doesn't detect Set mutations).

**Solution:** Reassign Set after mutations to trigger reactivity:
```typescript
expandedIds.value.add(nodeId)
expandedIds.value = new Set(expandedIds.value)  // Triggers Vue's proxy setter
```

**Result:** Standard Vue 3 pattern for reactive Sets/Maps.

### Primary vs Alias Menu Items (2025-10-19)
**Problem:** Which menu item to highlight when multiple items link to same page?

**Solution:** `isPrimary` flag distinguishes actual page locations from aliases:
- Primary (`- trinity` or `- trinity:`): Can be highlighted
- Alias (`- 'The Son': /`): Never highlighted, just navigation shortcuts
- Homepage `/`: Collapses all menus, no highlight

**Result:** Only primary location gets highlighted.

### Navigation Menu Cache & YAML Parser Fixes (2025-10-20)
**Problem:** Wrong order, missing separators, stale cache.

**Solution:**
1. **YAML Parser**: Handle both `-` and `- ` separator formats
2. **Hourly Cache**: `getCacheKey()` generates timestamp-based key that changes every 60 minutes

**Result:** Menu changes auto-picked up within 1 hour, no manual cache clearing needed.

### Hierarchical Menu System (2025-10-19)
**Solution:** Single `_menu.yml` per domain with nested YAML syntax. Supports headers, separators, submenus, relative/absolute paths, external URLs.

**Syntax:**
- `- trinity`: Lookup H1 from `trinity.md` (primary)
- `- trinity:` with children: Submenu
- `- 'Title': path`: Alias link (never highlighted)
- `- 'Header': ===`: Non-clickable section header
- `- ===`: Separator
- `../`, `./`, `/`: Relative/absolute path resolution

**Performance:** Menu built once on load, cached via `useState`. 1 HTTP request initially, 0 on navigation.

**Migration:** `npm run migrate:menu-format`

**Result:** Single source of truth, DRY principle, H1 titles auto-synced.

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
**Problem:** TOC disappeared after navigation (race condition with layout watch).

**Solution:** Use `onUpdated()` + `nextTick()` in page components with guard flag to prevent duplicate processing.

**Result:** TOC appears reliably on both initial load and navigation.

### Bolls.life Bible API Integration (2025-10-17)
**Solution:** Migrated to Bolls.life API for 100+ translations (ESV, NKJV, KJV, etc.). Uses book numbering (John=43), supports verse ranges, no authentication required.

**Implementation:** [bible-verse-utils.ts](app/utils/bible-verse-utils.ts) maps book names to numbers, fetches from `https://bolls.life/get-verse/{TRANSLATION}/{BOOK}/{CHAPTER}/{VERSE}/`

**Result:** Users get requested translations directly (defaults to ESV).

### Bible Tooltips CSS Extraction (2025-10-17)
**Solution:** Extracted inline styles to [bible-tooltips.css](app/assets/css/bible-tooltips.css). Retained only dynamic positioning in JS.

**Result:** DRY principle, easier maintenance, smaller JS bundle.

### Bible Tooltips Scoping Fix (2025-10-23)
**Problem:** Bible tooltips appeared in navigation, sidebars, breadcrumbs (scanned entire `document.body`).

**Solution:** `scan()` accepts optional `container` parameter. Pass `.content-body` element to scope processing to article content only.

**Result:** Tooltips only appear in markdown content.

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
