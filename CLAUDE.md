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

### Menu-Based Navigation (2025-10-09, updated 2025-10-16)
**Implementation:** `_menu.yml` files define order (fetched from `/public/` as static files)
- Syntax: `slug: .` (local), `slug: ./sub` (relative), `slug: /path` (absolute), `'Title': http://url` (external), `key: ---` (separator)
- External links open in new tab with security attributes (`noopener,noreferrer`)
- External links show open-in-new icon for visual indication
- Unlisted files appended alphabetically by H1 title
- Auto-synced by image watcher

**External Link Support (2025-10-16):**
```yaml
# _menu.yml format
'Our Father God': https://ofgod.info
'The Kingdom': https://kingdom.ofgod.info
```
- Creates TreeNode with `isExternal: true` and `externalUrl` properties
- Click handler opens link in new window instead of Vue Router navigation
- Attached directly to parent during menu parsing (not in tree build pass)
- Visual indicator: `mdi-open-in-new` icon appears next to title

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
│   ├── _menu.yml                    # Auto-copied from /content/
│   ├── page.image.jpg               # Auto-copied from /content/
│   └── church/
│       ├── _menu.yml                # Subdirectory menus
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

### Navigation Menu Order Incorrect (2025-10-09)
**Problem:** Navigation items displayed in alphabetical order instead of `_menu.yml` order.

**Root Cause:** `_menu.yml` files not copied to `/public/` before frontend fetches them. When fetch fails, code falls back to alphabetical sorting.

**Solution:** Modified `watchImages()` to synchronously copy all files BEFORE starting watcher:
```typescript
// scripts/watch-images.ts
export async function watchImages() {
  await cleanPublicDirectory()
  await copyAllImages()  // ← Ensures files ready before Nuxt starts serving
  // ... then start watcher with ignoreInitial: true
}
```

**Fix:** Restart dev server to trigger synchronous copy. Files copied in order:
1. Clean `/public/` (preserves favicon.ico, robots.txt)
2. Copy all images and `_menu.yml` files synchronously
3. Start watching for changes

### CONTENT Environment Variable Not Working (2025-10-15)
**Problem:** Command-line `CONTENT=domain npm run dev` defaulting to wrong directory or ignoring env var.

**Root Cause:** Environment variable captured at module import time instead of runtime. ES modules run top-level code immediately when imported.

**Symptoms:**
- `CONTENT=church npm run dev` shows "📦 Copying from: /content/ofgod/" (wrong domain)
- Watcher copying files from default domain instead of specified one
- Content from wrong domain appearing in navigation

**Solution:**
1. Check that `.env` file doesn't conflict with command-line value
2. Verify default is `ofgod` (not `eternal`) in [scripts/watch-images.ts](scripts/watch-images.ts#L19) and [content.config.ts](content.config.ts#L6)
3. Restart dev server completely: `Ctrl+C` then re-run with env var
4. Clear cache if switching domains: `rm -rf .nuxt .output`

**Correct Usage:**
```bash
CONTENT=church npm run dev       # Sets for single command
export CONTENT=church; npm run dev  # Sets for session
# OR edit .env file: CONTENT=church
```

### Image Watcher Not Working
- Check Nuxt `ready` hook in `nuxt.config.ts` (import path must be `'./scripts/watch-images'` NOT `'./scripts/watch-images.js'`)
- Verify `CONTENT` env var is set correctly (see above)
- Check console for "📦 Copying images and menus from:" message
- Check console for "👀 Watching images and menus in:" message
- Restart dev server if watcher doesn't start
- Verify files copied: `ls /public/church/history/` should show `_menu.yml`

### Images Not Appearing (404 errors)
- **Check URL structure**: Images should be at `/church/history/image.jpg` (no domain prefix)
- **Verify files exist**: `ls /public/church/history/` (domain prefix stripped in public)
- **Draft images**: If page is `*.draft.md`, images WON'T copy to `/public/` (expected behavior)
- **Dev mode**: Images auto-copied on startup. If missing, restart dev server
- **Manual copy**: `CONTENT=kingdom npx tsx scripts/copy-images.ts`
- **Wrong domain**: Ensure `CONTENT` env var matches (check `.env` file)
- **Production**: Run `npm run generate` (not `npm run build` - copies images first)

**Console Logs:**
```bash
# Published image copied:
✓ Image added: church/history/constantine.statue.jpg

# Draft image skipped:
⊗ Skipped draft image: constantine.aqaba_church.jpg
```

### Links with .md Extensions in Generated HTML
- **Check ProseA component**: Verify `/app/components/content/ProseA.vue` exists
- **Rebuild required**: Run `npm run generate` after ProseA changes
- **Test fragments**: Links like `/page.md#anchor` should render as `/page#anchor`
- **Inspect HTML**: Check `.output/public/**/*.html` for remaining `.md` extensions
- **Regex pattern**: ProseA uses `/\.md(#|\?|$)/` to handle fragments and query strings

### Migration Issues
- **Image naming**: Check if image name already matches page slug to avoid duplication
- **Relative links wrong**: Ensure page path is correct in migration context
- **Links missing .md**: Verify migration script adds `.md` to internal links
- Check migration output for `Internal Links` and `Migrated Images` counts
- Use `--dry-run` to preview without writing

### Content Not Loading
- Verify `CONTENT` env var matches directory in `/content/`
- Check `/content/{domain}/` exists and has `.md` files
- Ensure valid YAML frontmatter (title, published, navigation)
- Clear cache: `rm -rf .nuxt .output && npm run dev`

### Bible Verses Not Working
- Verify plugin loaded: Console shows "🔗 Bible Tooltips plugin starting..."
- Check for blue underlined text on references
- Shorthand needs full reference first: `John 14:16,26` (not `,26` alone)
- Run `npm test` to verify regex patterns
- Inspect element: `data-reference` should have full expanded reference

### TypeScript Errors
- Run `npx nuxi prepare` to regenerate types
- Clear cache: `rm -rf .nuxt .output`

### Hydration Mismatches
- Clear build cache: `rm -rf .nuxt .output && npx nuxi prepare && npm run dev`
- Always clear cache after template changes
- Bible tooltips scan after ContentRenderer via `watch` + `nextTick`

### Theme Not Persisting
- Use `useAppTheme` composable (not direct Vuetify manipulation)
- Theme stored in localStorage as `theme-preference`

### TOC Not Appearing After Navigation (2025-10-17)
**Problem:** Table of Contents appears on initial page load but disappears after navigating to other pages.

**Root Cause:** Race condition between layout and page components. Layout's `watch(route.path)` cleared TOC AFTER page had already generated it.

**Solution:** Use Vue's `onUpdated()` lifecycle hook in page components (see Architecture Decisions → TOC Post-Render Processing). Remove layout's conflicting `watch(route.path)`.

**Fix:**
```typescript
// Page components use useContentPostProcessing composable
useContentPostProcessing(page)

// Layout provides generateTOC but doesn't watch route changes
provide('generateTOC', () => {
  const container = mdAndUp.value ? desktopContentContainer.value : mobileContentContainer.value
  if (container) generateTOC(container)
})
```

**Key Insight:** `onUpdated()` is the standard Vue pattern for "run code after component updates". Fires reliably after ContentRenderer finishes rendering.

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
