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

### Bible Verse Detection with Trailing Punctuation (2025-11-13)
**Problem:** Bible references followed by punctuation (e.g., `Isaiah 53:3-12:` in list formatting) were not detected. The regex patterns used negative lookahead `(?!:)` and `(?![-:])` that rejected matches followed by colons.

**Solution:** Updated negative lookahead patterns to only reject matches followed by digits (which indicate continuation), while allowing punctuation:

```typescript
// Pattern 2 (same-chapter ranges): Changed (?!:) to (?!\d)
new RegExp(`\\b(${bookPattern})\\s+(\\d+):(\\d+)-(\\d+)${translationPattern}\\b(?!\\d)`, 'g')

// Pattern 3 (single verses): Changed (?![-:]) to (?![\d-])
new RegExp(`\\b(${bookPattern})\\s+(\\d+):(\\d+)${translationPattern}\\b(?![\\d-])`, 'g')
```

**Files Modified:**
- [bible-book-names.ts:31,33](app/utils/bible-book-names.ts#L31) - Updated negative lookahead patterns
- [bible-tooltips.test.ts:260-283](app/plugins/bible-tooltips.test.ts#L260-L283) - Added 4 new test cases

**Result:** References with trailing punctuation now detected correctly. All 18 unit tests pass.

### AppBar Dynamic Margins (2025-11-06)
**Problem:** AppBar icons overlapped with 320px sidebars. Icons didn't adjust when sidebars were toggled.

**Solution:** Make AppBar margins reactive to sidebar visibility state with CSS transitions:
```typescript
const props = defineProps<{ sidebarsVisible?: boolean }>()
:class="['app-bar', { 'sidebars-visible': sidebarsVisible }]"
```

```css
.app-bar :deep(.v-toolbar__content) {
  margin-left: 0;
  margin-right: 0;
  transition: margin-left 0.3s ease, margin-right 0.3s ease;
}

.app-bar.sidebars-visible :deep(.v-toolbar__content) {
  margin-left: 320px;
  margin-right: 320px;
}
```

**Files Modified:** [AppBar.vue:4,86-118](app/components/AppBar.vue), [default.vue:5](app/layouts/default.vue)

**Result:** Icons no longer overlap, margins smoothly transition when toggling sidebars.

### TypeScript Type Checking Configuration (2025-11-07)
**Problem:** Dev server failed with "Cannot find module '.../typescript-vue-tsc/lib/typescript.js'".

**Solution:** Disabled real-time type checking in `nuxt.config.ts`:
```typescript
typescript: { strict: true, typeCheck: false }
```

**Result:** Clean dev server startup. Type safety maintained through strict mode and build-time checks.

### Bible Verse Tooltip Hydration Fix (2025-10-27)
**Problem:** Client-side JS wrapped Bible references in spans during hydration, creating different HTML structures.

**Solution:** Use Nuxt Content's `content:file:beforeParse` hook to wrap Bible verses in spans BEFORE markdown is parsed:

```typescript
// nuxt.config.ts - Lines 59-115
hooks: {
  'content:file:beforeParse': (ctx) => {
    const { file } = ctx
    if (!file.id.endsWith('.md')) return
    const patterns = createBibleReferencePatterns()
    patterns.forEach(pattern => {
      const wrapped = `<span class="bible-ref" data-reference="${text}">${text}</span>`
      file.body = before + wrapped + after
    })
  }
}
```

**Cache Management:** Nuxt Content caches parsed files in `.data/`. Must delete `.data/` after adding/modifying hooks: `rm -rf .data`. Dev script auto-clears cache: `"dev": "rm -rf .data && nuxt dev"`

**Result:** Bible verses wrapped at build time. Server and client HTML match perfectly. No hydration errors.

### CDN Fonts with Fallbacks for Bible Tooltips (2025-10-27)
**Problem:** Book emoji `🕮` and Hebrew/Greek `אΩ` failed to render on Android due to missing glyphs.

**Solution:** Material Design Icons from CDN for book icon, Noto Sans font fallback for Hebrew/Greek:
- Book icon: `<i class="mdi mdi-book-open-variant"></i>`
- Hebrew/Greek: `<span class="bible-tooltip-hebrew-greek">אΩ</span>` with Noto Sans fallback

**Files Modified:** [nuxt.config.ts:52-53](nuxt.config.ts), [bible-tooltips.client.ts:187-188](app/plugins/bible-tooltips.client.ts), [bible-tooltips.css:68-76](app/assets/css/bible-tooltips.css)

**Result:** Icons render correctly on all platforms. CDN-hosted fonts with browser caching benefits.

### Menu Ordering & Alias Link Fixes (2025-10-24)
**Problem:** Menu items appeared in incorrect order when submenus were present. Alias links didn't render when target page was already listed elsewhere.

**Solution:**
```typescript
// Fix 1: Line 461 - Remove assignment to preserve parent's order counter
await processMenuItems(...)  // Was: order = await processMenuItems(...)

// Fix 2: Line 473 - Remove check that prevented alias creation
if (node) {  // Was: if (node && !orderedNodes.has(node))
```

**Files Modified:** [useNavigationTree.ts:461,473](app/composables/useNavigationTree.ts)

**Result:** Menu items render in exact `_menu.yml` order. Alias links work correctly.

### Menu Header & Chevron Fixes (2025-10-24)
**Header Text Alignment:** Add 1.75rem offset to header padding: `:style="{ paddingLeft: \`${depth * 1.25 + 1.75}rem\` }"`

**Chevron Visibility:** Use `:deep()` to target icon: `.tree-node.is-active :deep(.chevron-button .v-icon) { color: rgb(var(--v-theme-on-selected)); }`

### Standard YAML Parser Migration (2025-10-23)
**Solution:** Migrated to standard `yaml` npm package with simplified format:

**Syntax:**
- `- my-page` → lookup H1 from my-page.md
- `- Custom Title: path` → custom title link
- `- ===` → separator
- `- Section Name: ===` → non-clickable header

**Migration:** `npm run migrate:menu-format`

**Result:** Industry-standard YAML, better editor support, H1 titles auto-synced.

### Cloudflare Pages Static Site Routing (2025-10-17)
**Problem:** Direct page access returned 404 errors. `cloudflare-pages-static` preset generated SPA fallback behavior.

**Solution:** Use generic `static` preset with empty `_redirects` file to override cached rules:
```typescript
nitro: { preset: 'static' }
```

**Files:** [public/_redirects](public/_redirects), [scripts/watch-images.ts](scripts/watch-images.ts)

**Result:** Pure static HTML serving. Empty `_redirects` overrides cached rules.

### Environment Variable Loading Fix (2025-10-15)
**Problem:** Command-line env vars ignored. ES module top-level code captured `process.env.CONTENT` at import time.

**Solution:** Read env vars at runtime inside functions:
```typescript
function getContentDomain(): string {
  return process.env.CONTENT || 'ofgod'
}
```

**Result:** `CONTENT=church npm run dev` now works correctly.

### BibleHub Interlinear Links (2025-10-15)
**Solution:** Added second link in tooltip for BibleHub interlinear translations:
```typescript
export function createBibleHubInterlinearUrl(reference: string): string {
  const bookSlug = book.toLowerCase().replace(/\s+/g, '_')
  return `https://biblehub.com/interlinear/${bookSlug}/${chapter}-${verse}.htm`
}
```

**Result:** Users access Greek/Hebrew interlinear translations from tooltips.

### Layout & Styling (2025-10-12 to 2025-10-13)
- **VNavigationDrawer**: Vuetify + `position: fixed !important` CSS override
- **Sidebar Width**: 320px for both drawers
- **Layout**: Standard scrolling, sidebars slide with `transform: translateX`
- **MD3 Inputs**: `VTextField` defaults `rounded="pill"`
- **Nested Blockquotes**: Indented 1rem, primary-colored border, defined in [markdown.css](app/assets/css/markdown.css) and [print.css](app/assets/css/print.css)

### Draft Content Exclusion System (2025-10-09)
**Solution:** `.draft.md` extension with intelligent image handling:
```typescript
// content.config.ts
source: { exclude: ['**/*.draft.md'], prefix: '/' }

// scripts/watch-images.ts - Draft-only images stay in /content/
async function isDraftOnlyImage(imagePath: string): Promise<boolean> {
  const hasPublished = await fs.pathExists(`${prefix}.md`)
  const hasDraft = await fs.pathExists(`${prefix}.draft.md`)
  return !hasPublished && hasDraft
}
```

**Result:** Draft content excluded from builds, images stay in `/content/` only.

### Navigation & Content System (2025-10-07 to 2025-10-20)
**Tree Navigation:** Desktop 3-column (320px nav + content + 320px TOC), breadcrumbs, auto-expanding tree, H2-H3 TOC

**Key Features:**
- Menu loading state lock via `useState` prevents double-fetch
- Set reactivity: `expandedIds.value = new Set(expandedIds.value)`
- Primary vs alias items: `isPrimary` flag for highlighting
- Hourly cache: `getCacheKey()` timestamp-based key
- Single `_menu.yml` per domain with nested YAML

**Bible Verse Tooltips:**
- Client-side plugin detects plain text (66 Bible books whitelist)
- Shorthand expansion (`John 14:16,26`)
- Bolls.life API for 100+ translations
- Scoped to `.content-body` container only

**Composables:** `useBreadcrumbs`, `useNavigationTree`, `useSearchRelevance`, `useTableOfContents`, `useContentPostProcessing`

### Miscellaneous Fixes
- **Markdown Links:** Store WITH `.md`, ProseA strips at render time
- **Frontmatter-Free:** H1-based titles, `.draft.md` for unpublished
- **SEO:** Optional `description` frontmatter → meta tags + tooltips
- **Search Ranking:** Field weights, match quality, position bonuses
- **TOC Processing:** `onUpdated()` + `nextTick()` with guard flag
- **CSS Extraction:** Inline styles → [bible-tooltips.css](app/assets/css/bible-tooltips.css)

## Usage Instructions

### Setup
```bash
npm install
export CONTENT=kingdom  # or add to .env file
```

### Development
```bash
npm run dev                    # Start dev server (auto-clears .data cache)
npm run dev:cached             # Keep cache (faster startup)
CONTENT=kingdom npm run dev    # Use specific domain
```

### Testing
```bash
npm test                       # Run all unit tests
npm test -- bible-tooltips     # Run Bible reference tests
```

### Content Migration
```bash
npm run migrate -- --section=04.kingdom --domain=kingdom
npm run migrate -- --dry-run   # Preview changes
```

### Git Submodules
```bash
git clone --recursive https://github.com/life-and-dev/website.git
git submodule init && git submodule update
git submodule update --remote  # Update to latest
```

## Production Deployment

### Cloudflare Pages Configuration

**IMPORTANT:** Set build output directory to `.output/public` (NOT `dist`)

1. Go to Cloudflare Pages → **Builds & deployments**
2. **Build output directory**: `.output/public`
3. **Build command**: `CONTENT=<domain> npm run generate`
4. **Environment variable**: `CONTENT=<domain>`

### Build Commands Per Domain

```bash
CONTENT=ofgod npm run generate       # → ofgod.info
CONTENT=kingdom npm run generate     # → kingdom.ofgod.info
CONTENT=church npm run generate      # → church.ofgod.info
CONTENT=prophecies npm run generate  # → prophecies.ofgod.info
CONTENT=son npm run generate         # → son.ofgod.info
CONTENT=word npm run generate        # → word.ofgod.info
```

**Output:** `.output/public/` contains complete static site

### Hosting Options
- **Cloudflare Pages** (Recommended) - Global CDN
- **Netlify/Vercel** - Set publish directory to `.output/public`
- **GitHub Pages** - Deploy `.output/public` directory
- **Any static host** - Pure HTML/CSS/JS

## Project Structure

```
/root/ofgod/
├── app/
│   ├── components/
│   │   ├── AppBar.vue              # Breadcrumbs, print, theme
│   │   ├── AppNavigation.vue       # Tree navigation + search
│   │   ├── AppTableOfContents.vue  # TOC sidebar
│   │   └── content/
│   │       ├── ProseA.vue            # Strips .md from links
│   │       ├── ProseBlockquote.vue   # Custom blockquote
│   │       └── ProseTable.vue        # v-data-table renderer
│   ├── composables/
│   │   ├── useBreadcrumbs.ts
│   │   ├── useNavigationTree.ts
│   │   ├── useSearchRelevance.ts
│   │   ├── useSiteConfig.ts
│   │   ├── useGitHubEdit.ts
│   │   ├── useTableOfContents.ts
│   │   ├── useContentPostProcessing.ts
│   │   └── useTableParser.ts
│   ├── pages/
│   │   ├── index.vue
│   │   └── [...slug].vue
│   ├── plugins/
│   │   ├── bible-tooltips.client.ts
│   │   └── bible-tooltips.test.ts
│   ├── types/
│   │   └── table.ts
│   └── utils/
│       ├── bible-verse-utils.ts
│       └── bible-book-names.ts
├── content/                  # Git submodules
│   ├── ofgod/
│   ├── church/
│   ├── kingdom/
│   ├── son/
│   └── word/
│       ├── _menu.yml
│       ├── index.md
│       ├── page.md
│       ├── draft.draft.md
│       └── page.image.jpg
├── public/                   # Auto-generated (gitignored)
│   ├── _menu.yml
│   └── page.image.jpg
├── scripts/
│   ├── migrate-grav.ts
│   ├── copy-images.ts
│   └── watch-images.ts
├── content.config.ts
└── nuxt.config.ts
```

## Markdown Format

**Files:** `page.md` or `page.draft.md` (unpublished)

```markdown
# Page Title

Content...

## Section Heading

More content...
```

**Frontmatter (Optional):**
```yaml
---
description: Brief description for SEO and tooltips
---
```

**Navigation:** Controlled by `_menu.yml` (see Standard YAML Parser Migration)

## Troubleshooting

### Content Config Issues
**Problem:** No pages loading, navigation empty.

**Fix:**
```typescript
// Exclude must be array, not string
exclude: ['**/*.draft.md']  // NOT: '**/*.draft.md'

// Prefix required for navigation tree
source: { cwd: '...', include: '**/*.md', prefix: '/' }
```

Clear cache: `rm -rf .nuxt .output && npm run dev`

### CONTENT Environment Variable Not Working
Restart dev server, clear cache: `rm -rf .nuxt .output`. Verify `.env` doesn't conflict.

### Image Watcher Not Working
- Check `nuxt.config.ts` import: `'./scripts/watch-images'` NOT `'./scripts/watch-images.js'`
- Verify `CONTENT` env var set
- Check console for "📦 Copying images..." and "👀 Watching images..." messages
- Restart dev server

### Images Not Appearing
- Restart dev server (auto-copies on startup)
- Manual: `CONTENT=domain npx tsx scripts/copy-images.ts`
- Draft images don't copy to `/public/` (expected)

### vite-plugin-checker Missing Module Error
**Error:** `Cannot find module '.../typescript-vue-tsc/lib/typescript.js'`

**Fix:** We disabled real-time type checking (`typeCheck: false`). The directory auto-regenerates on first dev server start if you re-enable it.

### TOC Not Appearing After Navigation
Use `onUpdated()` + `nextTick()` in page components with guard flag.

### Navigation Menu Not Expanding
Reassign Set after mutations: `expandedIds.value = new Set(expandedIds.value)`

## Coding Rules

### DRY Principle (Don't Repeat Yourself) - MANDATORY
Every piece of knowledge should have a single, unambiguous, authoritative representation. Never duplicate code, data, logic, or configuration. Changes should only require modification in ONE place.

### CSS Unit Guidelines - MANDATORY
**Use `rem` for all spacing/sizing** (padding, margin, border-radius, font-size)

**Exceptions (use `px`):**
- Sidebar widths (affected by breakpoints)
- Border widths (e.g., `1px`)
- z-index values (dimensionless)

**Conversion:** 0.25rem=4px, 0.5rem=8px, 0.75rem=12px, 1rem=16px, 1.5rem=24px, 1.75rem=28px

**Examples:**
```css
/* ✅ CORRECT */
.search-box {
  padding: 0.75rem;
  border-radius: 1.75rem;
  margin-top: 0.5rem;
}
.v-navigation-drawer { width: 320px; }
.card { border: 1px solid; }

/* ❌ WRONG */
.search-box {
  padding: 12px;
  border-radius: 28px;
}
```

### Empty Types
- `undefined` for uninitialized fields
- `null` for deliberately empty initialized fields
- `''` only for text fields where a value is always expected

### Enums
Never use TypeScript enums. Use Const Assertions:
```ts
export const Status = {
  A_VALUE: 'A_VALUE',
  NEXT_VALUE: 'NEXT_VALUE',
} as const;
export type StatusEnum = keyof typeof Status;
```

### File Naming Convention
- kebab-case for URL/route files
- PascalCase for Vue components and models
- camelCase for other files
- Special extensions: `.config.ts`, `.d.ts`, `.schema.ts`, `.test.ts`
