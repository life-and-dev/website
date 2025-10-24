# Multi-Domain Static Site Generator

Nuxt 4 + Vuetify 3 static site generator with multi-domain support. Converts Grav CMS content to modern Material Design 3 websites.

## Running the Project Locally

### TLDR

```bash
npm install
CONTENT=kingdom npm run dev  # Start dev server for kingdom domain
```

### Prerequisites

* **Node.js** 18+ or 20+ (LTS version recommended)
* **npm** 9+ (comes with Node.js)
* **Git** (for cloning repository)

### Git Submodules Architecture

This project uses **git submodules** for content management. Each content domain is a separate repository with **squashed single-commit history**.

* **Main Repository:** `life-and-dev/website` - Technical sources (app, scripts, configs)
* **Content Submodules:** Separate repos for each domain (1 commit each)
  * `life-and-dev/ofgod` → `/content/ofgod/`
  * `life-and-dev/church` → `/content/church/`
  * `life-and-dev/kingdom` → `/content/kingdom/`
  * `life-and-dev/son` → `/content/son/`
  * `life-and-dev/word` → `/content/word/`

**Benefits:**
* Content editors can work on content repos independently
* Clean commit history (1 commit by life-and-dev per repo)
* "Edit on GitHub" links point to domain-specific repos
* Easier access control per content domain
* Professional presentation on GitHub (single contributor)

**History Architecture:**
All repositories (main + submodules) use orphan branch technique to maintain single-commit history. Each repo shows only 1 commit authored and committed by `life-and-dev <dev@ofgod.info>`.

**Common Submodule Operations:**
```bash
# Clone with submodules (REQUIRED for new clones)
git clone --recursive https://github.com/life-and-dev/website.git

# Initialize submodules (if already cloned without --recursive)
git submodule init
git submodule update

# Update all submodules to latest main branch
git submodule update --remote

# Update specific submodule
cd content/church
git pull origin main
cd ../..
git add content/church
git commit -m "Update church submodule"

# Check submodule status
git submodule status
```

**Important:** Always use `git clone --recursive` when cloning this repository to automatically initialize all content submodules.

### Installation Steps

1. **Clone the repository with submodules:**
   ```bash
   git clone --recursive https://github.com/life-and-dev/website.git
   cd website
   ```

   **Note:** The `--recursive` flag automatically initializes and clones all content submodules.

   **If you already cloned without `--recursive`:**
   ```bash
   git submodule init
   git submodule update
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set content domain:**
   ```bash
   # Option 1: Environment variable
   export CONTENT=kingdom

   # Option 2: Create .env file
   echo "CONTENT=kingdom" > .env
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # Or with inline environment variable:
   CONTENT=kingdom npm run dev
   ```

5. **Visit:** `http://localhost:3000`

### Available Domains

* `son` - son.ofgod.info
* `kingdom` - kingdom.ofgod.info
* `church` - church.ofgod.info
* `ofgod` - ofgod.info (default)

## Content Layout

### TLDR

```markdown
# Page Title

Content goes here...

## Section Heading
```

**File:** `/content/kingdom/page.md` → URL: `https://kingdom.ofgod.info/page`
**Images:** `/content/kingdom/page.image.jpg` (co-located)
**Navigation:** `/content/kingdom/_menu.yml` (controls order)

### Domain Directories

Content is organized by domain in `/content/{domain}/`:

```
/content/
├── son/          → son.ofgod.info
├── kingdom/      → kingdom.ofgod.info
├── church/       → church.ofgod.info
└── ofgod/        → ofgod.info (default)
```

**Build:** Each domain requires separate build with `CONTENT` env var:
```bash
CONTENT=kingdom npm run generate  # Builds kingdom.ofgod.info
```

**URL Structure:** Domain prefix is **NOT** included in URLs:
* File: `/content/kingdom/church/history.md`
* URL: `https://kingdom.ofgod.info/church/history` (NOT `/kingdom/church/history`)

### Markdown File Format

**Required Structure:**
```markdown
# Page Title

First paragraph...

## Section Heading

Content...

### Subsection

More content...
```

**Rules:**
* **H1 Required:** First line must be `# Title` (becomes page title)
* **Headers:** Start with H2 (`##`) for sections, H3 (`###`) for subsections
* **No H1 Duplication:** Only ONE H1 per page (the title)
* **Draft Files:** Use `.draft.md` extension (e.g., `draft-page.draft.md`) - excluded from builds

**Optional Frontmatter:**
```yaml
---
description: Brief page description for SEO and navigation tooltips
---
```

**Description Field Usage:**
* **SEO:** Included in `<meta name="description">` tag for search engines/LLMs
* **Navigation Tooltips:** Shows on hover in navigation tree (desktop: right, mobile: bottom)
* **Search Tooltips:** Shows on hover in search results
* **Max-width:** 600px (wraps to multiple lines if longer)
* **Optional:** Pages without description work normally

### Supported Markdown Styles

**Bold/Italic:**
```markdown
**bold text**
*italic text*
***bold and italic***
```

**Lists:**
```markdown
* Unordered list item
* Another item
  * Nested item

1. Ordered list item
2. Another item
```

**Links:**
```markdown
[External link](https://example.com)
[Internal link](/church/history.md)
[Same directory](./sibling-page.md)
[Parent directory](../parent-page.md)
```

**Images:**
```markdown
![Alt text](image-name.jpg)
![With description](page.image-name.jpg)
```

**Tables:**
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```
*Automatically rendered as Material Design v-data-table with sorting*

**Blockquotes:**
```markdown
> This is a quote
> Multiple lines
>
> > This is a nested quote
> > Inside the first quote
>
> Back to outer quote
```
*Rendered as Material Design cards with visual hierarchy for nested quotes (indented, colored border)*

**Code:**
````markdown
Inline `code` text

```typescript
// Code block with syntax highlighting
const example = 'value'
```
````

**Bible Verses (Auto-detected):**
```markdown
John 3:16 (ESV)
Matthew 5:3-12 (NIV)
Psalm 23 (KJV)
John 14:16,26  # Shorthand for multiple verses
```
*Automatically enhanced with tooltips showing verse text (World English Bible translation) + links to BibleGateway and BibleHub interlinear*

### Image Guidelines

**Location:** Co-locate images with markdown files in `/content/{domain}/`

**Naming Convention:**
```
page-slug.descriptive-name.jpg
```

**Examples:**
* `/content/kingdom/church.jpg` - Main image for church.md
* `/content/kingdom/church/history.dark-ages.jpg` - Image for history.md page
* `/content/kingdom/church/history/constantine.statue.jpg` - Image for constantine.md

**Supported Formats:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`

**Draft Images:** Images for `.draft.md` files stay in `/content/` and are NOT copied to `/public/`

**Automatic Sync:**
* Dev mode: Auto-copies images to `/public/` on startup + watches for changes
* Production: `npm run generate` copies images before build
* Path transformation: `/content/kingdom/church/image.jpg` → `/public/church/image.jpg` (domain prefix stripped)

### Markdown Link Format

**Internal Links (Same Domain):**

```markdown
# Absolute path (from domain root)
[Church History](/church/history.md)

# Relative path (same directory)
[Sibling Page](./sibling.md)
[Local with dot](christian.md)  # Resolved to /church/history/christian.md

# Parent directory
[Parent](../parent-page.md)

# With fragment
[Section](/page.md#section-heading)
```

**Cross-Domain Links:** NOT supported (each domain is separate build)

**External Links:**
```markdown
[Wikipedia](https://en.wikipedia.org/wiki/Article)
```

**Link Storage:**
* **In Files:** Store links WITH `.md` extension (e.g., `/page.md`)
* **In Browser:** Automatically stripped to `/page` by ProseA component
* **Benefit:** Links work in VS Code preview AND web browser

### Frontmatter Attributes

**Valid Attributes:**
```yaml
---
description: Brief page description for SEO and tooltips (optional)
---
```

**Description Attribute:**
* **Purpose:** SEO meta tags + navigation/search tooltips
* **Where it appears:**
  * `<meta name="description">` in HTML `<head>` (for Google, LLMs, etc.)
  * Tooltip when hovering navigation menu items
  * Tooltip when hovering search results
* **Responsive:** Desktop tooltips appear to the right, mobile appear below
* **Max-width:** 600px (prevents overlap with navigation bar)
* **Optional:** Pages work fine without description

**Removed Attributes** (no longer used):
* ~~`title`~~ - Use H1 header instead
* ~~`published`~~ - Use `.draft.md` extension instead
* ~~`navigation`~~ - Use `_menu.yml` files instead

### Search Feature

**Location:** Top of navigation sidebar (desktop) or drawer (mobile)

**Search Behavior:**
* **Client-side:** Searches all page titles, descriptions, keywords, and excerpts
* **Real-time:** Results appear as you type
* **Relevance Ranking:** Most relevant results appear first
* **Deduplication:** Each page appears only once
* **Limit:** Top 50 results shown

**Relevance Factors:**
1. **Field Priority:** Title matches > Keyword matches > Description matches > Excerpt matches
2. **Match Quality:** Exact matches > StartsWith matches > Contains matches
3. **Page Depth:** Shallow pages rank higher than deeply nested pages
4. **Multi-field:** Pages matching in multiple fields get bonus points

**Search Results Display:**
* **Title:** Page title (clickable link)
* **Path:** Full path with `/` separators (e.g., "church/history/crusades")
* **Description Tooltip:** Hover to see page description (if available)

**Example Search** ("church"):
1. "The Church" - `church` (exact title match, top level)
2. "The History of the Church" - `church/history` (title starts with query)
3. "Bible Modifications" - `church/modifications` (keyword match)

### Navigation Menu Configuration

**File:** Single `_menu.yml` per domain at `/content/{domain}/_menu.yml`

**Format:** Hierarchical YAML array with nested submenus

```yaml
# Primary menu item (can be highlighted when active)
- trinity

# Submenu with children (also primary)
- trinity:
  - abraham-3-visitors
  - Members of the Trinity:        # Header (non-clickable)
  - 'The Father': https://ofgod.info   # External link
  - 'The Son': /                   # Alias (never highlighted)
  - holy-spirit

# Separator (visual divider)
-

# Root-level pages
- about
- disclaimer
```

**Menu Item Types:**

1. **Primary Items** (string syntax): `- trinity`
   * Represents actual page location in navigation hierarchy
   * Gets highlighted when that page is active
   * Can have children (becomes expandable submenu)

2. **Alias Links** (object syntax): `- 'The Son': /`
   * Custom-titled shortcut to any page
   * Never gets highlighted (even when navigating to that page)
   * Never expandable (always link-only, even if target page has children)
   * Useful for cross-references within navigation

3. **Headers** (object with null): `- 'Section Name':`
   * Non-clickable section labels
   * Uppercase styling, secondary color
   * Organize menu into logical groups

4. **Separators** (blank): `-`
   * Visual horizontal dividers
   * Non-clickable

5. **External Links**: `- 'Title': https://example.com`
   * Open in new tab with icon indicator
   * Never highlighted

**Path Resolution:**
```yaml
- page                  # Relative: /page
- ./sub/page            # Current dir: /sub/page
- /about                # Absolute: /about
- folder:               # Submenu
  - child               # Relative to /folder: /folder/child
  - ../sibling          # Parent dir: /sibling
  - /root-page          # Absolute: /root-page
```

**Primary vs Alias Example:**
```yaml
- trinity:              # Primary (highlighted when viewing /trinity)
  - 'The Son': /        # Alias to homepage (NOT highlighted when viewing /)
  - holy-spirit         # Primary (highlighted when viewing /trinity/holy-spirit)
```

**When viewing `/trinity/holy-spirit`:**
* ✅ "holy-spirit" item is highlighted (primary)
* ❌ "The Son" is NOT highlighted (alias)
* ✅ "trinity" parent is expanded (auto-expand to active page)

**Homepage Behavior:**
* Navigating to `/` (homepage) collapses all menus
* No menu items are highlighted (homepage has no primary menu item)

**Ordering:**
* Menu items display in **exact order** listed in `_menu.yml`
* Unlisted `.md` files appear at bottom, sorted alphabetically by H1 title
* Missing `_menu.yml` → all files sorted alphabetically

**Auto-Sync:**
* Changes to `_menu.yml` auto-sync during development
* File watcher copies from `/content/{domain}/` to `/public/`

## Local Development Setup

### TLDR

```bash
npm install
CONTENT=kingdom npm run dev
# Visit http://localhost:3000
```

### Step-by-Step Tutorial

1. **Install Dependencies:**
   ```bash
   npm install
   ```
   *Common pitfall:* Ensure Node.js 18+ is installed (`node --version`)

2. **Choose Content Domain:**
   ```bash
   # Set environment variable
   export CONTENT=kingdom

   # Or create .env file (persists across sessions)
   echo "CONTENT=kingdom" > .env
   ```
   *Common pitfall:* Forgetting to set `CONTENT` will default to `ofgod` domain

3. **Start Development Server:**
   ```bash
   npm run dev

   # Or inline (doesn't require export/env file):
   CONTENT=kingdom npm run dev
   ```

   **What happens:**
   * Cleans `/public/` directory (except `favicon.ico`, `robots.txt`)
   * **Synchronously** copies published images from `/content/kingdom/` to `/public/`
   * **Synchronously** copies `_menu.yml` files to `/public/`
   * Starts file watcher for auto-sync on changes
   * Launches Nuxt dev server on port 3000

   *Note: Files are copied synchronously before server starts to ensure navigation menu order is correct*

4. **Open Browser:**
   ```
   http://localhost:3000
   ```

5. **Make Changes:**
   * Edit markdown files in `/content/kingdom/`
   * Add/remove images (auto-synced)
   * Update `_menu.yml` (auto-synced)
   * Changes trigger hot module replacement (HMR)

**Common Pitfalls:**

* **Wrong domain showing:** Check `CONTENT` env var matches desired domain (see troubleshooting below)
* **Images 404:** Restart dev server to trigger initial image copy
* **Navigation empty:** Verify `_menu.yml` files exist and are valid YAML
* **Changes not reflecting:** Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
* **Command-line CONTENT ignored:** `.env` file may conflict - delete `.env` or use `export CONTENT=domain` before running npm

### Running Tests

```bash
npm test  # Runs all unit tests

# Run specific test suites
npm test -- useSearchRelevance  # Search relevance scoring tests
npm test -- bible-tooltips      # Bible verse reference parsing tests
```

**Test Coverage:**
* Search relevance scoring (17 tests)
  * Field weight prioritization
  * Match quality scoring (exact/startsWith/contains)
  * Path depth penalties
  * Multi-field bonuses
  * Tie-breaking with alphabetical sort
* Bible verse regex patterns (14 tests)
  * Reference parsing and detection
  * Shorthand expansion (`John 14:16,26`)
  * Cross-chapter ranges
  * Reference validation
* BibleHub URL generation (15 tests)
  * Book name normalization (spaces to underscores)
  * Verse and chapter-only references
  * Handling of multi-word book names

## Development Guidelines

### Project-Specific Deviations from Nuxt

**1. Static Site Only:**
* NO server-side API routes (pure SSG)
* NO server middleware
* `_menu.yml` files served as static assets from `/public/`

**2. Content System:**
* @nuxt/content v3 with SQL-based storage (WASM SQLite)
* Content source changes via `CONTENT` env var (not typical Nuxt pattern)
* Domain prefix stripped from URLs (handled by `content.config.ts`)

**3. File Watcher Integration:**
* Nuxt `ready` hook starts image/menu watcher (`nuxt.config.ts`)
* Copies files from `/content/` to `/public/` with path transformation
* Separate from Nuxt's built-in HMR

**4. Component Overrides:**
* `ProseA.vue` - Strips `.md` from links
* `ProseTable.vue` - Renders tables as Vuetify v-data-table
* `ProseBlockquote.vue` - Renders quotes as Material Design cards

**5. Post-Render Processing:**
* Uses Vue's `onUpdated()` lifecycle hook for content processing
* `useContentPostProcessing` composable handles Bible tooltips + TOC generation
* Processes after Nuxt Content's ContentRenderer finishes rendering
* Guard flags prevent duplicate processing during navigation

**6. Navigation System:**
* H1-based titles (extracted from markdown body, not frontmatter)
* `_menu.yml` files control order (fetched via HTTP, not @nuxt/content query)
* Alphabetical fallback for unlisted pages
* Table of Contents (TOC) generated from H2/H3 headings (minimum 2 required)
* TOC appears in right sidebar (desktop) or mobile drawer expansion panel

**7. Material Design 3 Styling:**
* Text fields use `rounded="pill"` for semi-circular ends (MD3 spec)
* Configured globally in `nuxt.config.ts` VTextField defaults
* All inputs inherit pill shape without component-specific overrides

**8. Vuetify Layout System with Fixed Positioning:**
* Desktop sidebars use VNavigationDrawer components for MD3 styling
* CSS overrides force `position: fixed` for sticky behavior (not typical Vuetify usage)
* Content spacing managed by Vuetify's `--v-layout-left/right` CSS variables
* Hybrid approach: Vuetify styling + custom positioning requirements

### Coding Rules

**DRY Principle (Mandatory):**
* Every piece of knowledge has single source of truth
* No duplication of code, data, logic, or configuration
* Changes should only require modification in ONE place

**CSS Unit Guidelines (Mandatory):**
* **Use `rem` for all spacing/sizing:** padding, margin, border-radius, font-size, etc.
* **Use `px` ONLY for:** sidebar widths (280px), border widths (1px), z-index
* **Why:** `rem` scales with user font preferences (accessibility), prevents visual bugs
* **Conversion:** 0.25rem=4px, 0.5rem=8px, 0.75rem=12px, 1rem=16px, 1.75rem=28px

```css
/* ✅ CORRECT */
.search-box {
  padding: 0.75rem;
  border-radius: 1.75rem;
}

/* ❌ WRONG */
.search-box {
  padding: 12px;
  border-radius: 28px;
}
```

**Empty Types:**
* `undefined` - Uninitialized fields
* `null` - Deliberately empty initialized fields
* `''` - Text fields where value is always expected

**Enums:**
Use Const Assertions (NOT TypeScript enums):
```typescript
export const Status = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const
export type StatusEnum = keyof typeof Status
```

### Naming Conventions

* **Files (routes):** `kebab-case.vue`
* **Components:** `PascalCase.vue`
* **Composables:** `camelCase.ts`
* **Config files:** `name.config.ts`
* **Type definitions:** `name.d.ts`
* **Tests:** `name.test.ts`

**Constants:**
```typescript
const API_KEY = 'value'  // UPPER_SNAKE_CASE
```

**Functions/Variables:**
```typescript
const userName = 'John'  // camelCase
function getUserData() {}  // camelCase
```

## Production Deployment

### TLDR

```bash
CONTENT=kingdom npm run generate
# Deploy .output/public/ to kingdom.ofgod.info
```

### Build Process

**Per Domain:**
```bash
# Build for specific domain
CONTENT=son npm run generate
CONTENT=kingdom npm run generate
CONTENT=church npm run generate

# Output location
ls .output/public/  # Static HTML/CSS/JS files
```

**What Happens:**
1. Copies published images from `/content/{domain}/` to `/public/`
2. Copies `_menu.yml` files to `/public/`
3. Runs Nuxt SSG (pre-renders all pages)
4. Generates static HTML files in `.output/public/`

### Deployment

**Compatible Hosts:**
* Netlify
* Vercel
* GitHub Pages
* AWS S3 + CloudFront
* Any static file hosting

**Deploy Directory:** `.output/public/`

**Example (Netlify):**
```toml
# netlify.toml
[build]
  command = "CONTENT=kingdom npm run generate"
  publish = ".output/public"
```

**Important:**
* Each domain requires separate deployment
* Set `CONTENT` env var in hosting platform settings
* No server-side code (pure static files)

### Preview Production Build

```bash
npm run preview
# Visit http://localhost:3000
```

## Troubleshooting

### CONTENT Environment Variable Not Working

**Symptoms:**
* Running `CONTENT=church npm run dev` shows wrong domain in console: `📦 Copying from: /content/ofgod/` or `/content/kingdom/`
* Content from different domain appears in browser
* Image watcher copying files from wrong directory

**Causes:**
1. `.env` file overriding command-line value
2. Terminal session has conflicting `export CONTENT=...`
3. Cached environment in shell

**Fix:**

**Option 1: Remove .env conflict**
```bash
# Delete or edit .env file
rm .env
# OR edit .env to match desired domain
echo "CONTENT=church" > .env
npm run dev
```

**Option 2: Use export**
```bash
export CONTENT=church
npm run dev
```

**Option 3: Force inline (most reliable)**
```bash
# This ALWAYS overrides .env in most shells
CONTENT=church npm run dev
```

**Verification:**
Check console output on startup:
```
📦 Copying images and menus from: /root/ofgod/content/church
```
If you see `/content/ofgod/` or `/content/kingdom/` instead of your specified domain, the env var isn't being read correctly.

**Technical Note:** Command-line env vars should override `.env` files, but some shells or environments may behave differently. Using `export` or editing `.env` directly is most reliable.

### Images Not Appearing (404)

**Check:**
1. File exists: `ls /public/church/image.jpg`
2. URL correct: `/church/image.jpg` (no domain prefix)
3. Draft page: `.draft.md` files don't copy images

**Fix:**
```bash
# Manual copy
CONTENT=kingdom npx tsx scripts/copy-images.ts

# Restart dev server
npm run dev
```

### Navigation Empty/Wrong Order

**Symptoms:**
* Items appear in alphabetical order instead of `_menu.yml` order
* Navigation tree shows incorrect hierarchy

**Check:**
1. `_menu.yml` exists: `ls /content/kingdom/_menu.yml`
2. Valid YAML syntax (no tabs, proper indentation)
3. Files copied to public: `ls /public/_menu.yml`
4. Browser console for 404 errors fetching `/_menu.yml`

**Fix:**
```bash
# Restart dev server (triggers synchronous copy)
# Press Ctrl+C to stop, then:
npm run dev

# Or manually copy files:
CONTENT=kingdom npx tsx scripts/copy-images.ts

# Verify files copied:
ls /public/_menu.yml
ls /public/church/_menu.yml
```

**Root Cause:** `_menu.yml` files must be in `/public/` for frontend to fetch them. If missing, navigation falls back to alphabetical sorting. Dev server now copies these files synchronously on startup before serving requests.


### TypeScript Errors After Clean

**Symptom:** `Cannot read file '/root/ofgod/.nuxt/tsconfig.server.json'`

**Cause:** `.nuxt` directory was deleted but TypeScript checker starts before Nuxt regenerates it

**Fix:**
```bash
# Regenerate TypeScript config BEFORE starting dev server
npx nuxi prepare
npm run dev
```

**Why this happens:** When you delete `.nuxt`, TypeScript expects config files immediately, but Nuxt generates them asynchronously. Running `npx nuxi prepare` ensures they exist before starting.

**When to use:**
* After deleting `.nuxt` directory
* After cache corruption errors
* After installing new Nuxt modules

### Tooltips Not Appearing

**Check:**
1. Page has `description` in frontmatter
2. Vuetify `useDisplay()` working (responsive tooltips)
3. Browser console for errors

**Fix:**
```bash
# Clear cache and rebuild
rm -rf .nuxt .output
npx nuxi prepare
npm run dev
```

### Duplicate SearchBox on Mobile

**Old Issue (Fixed):** Mobile drawer showed two search boxes

**Solution:** `AppNavigation` component now accepts `showSearch` prop:
* Desktop: `<AppNavigation :show-search="true" />` (shows search)
* Mobile: `<AppNavigation :show-search="false" />` (hides search, uses standalone)

### Table of Contents Not Appearing

**Symptoms:**
* TOC appears on initial page load but disappears after navigation
* TOC never appears on any page
* TOC appears inconsistently

**Causes:**
1. Page has fewer than 2 H2/H3 headings (TOC minimum)
2. Race condition between layout and page components (fixed in 2025-10-17)

**Check:**
```bash
# View page headings in browser console
document.querySelectorAll('h2, h3')
# Should return NodeList with 2+ elements
```

**Solution:**
The TOC system uses Vue's `onUpdated()` lifecycle hook to process content after Nuxt Content's ContentRenderer finishes rendering. This is the standard Vue pattern.

**Technical Details:**
* `useContentPostProcessing` composable runs in page components
* Processes after ContentRenderer completes (via `onUpdated()` + `nextTick()`)
* Guard flag prevents duplicate processing
* Layout provides `generateTOC` function but doesn't manage timing
* `useTableOfContents` checks for minimum 2 H2/H3 headings

**If TOC still doesn't appear:**
```bash
# Clear cache and restart
rm -rf .nuxt .output
npm run dev
```

### Bible Verse Tooltips Not Working

**Symptoms:**
* Blue underlines appear but tooltip shows "Click the links below to read this verse"
* No verse text in tooltip
* API error in browser console

**Cause:**
Bible API (bible-api.com) returns verse text in World English Bible (WEB) translation. If API is unavailable, tooltip shows fallback text with links only.

**Check:**
```bash
# Test API directly
curl "https://bible-api.com/John%203:16"
# Should return JSON with verse text
```

**Fix:**
* API unavailability is temporary - retry later
* Links to BibleGateway and BibleHub still work (external sites)
* No code changes needed - API issue resolves itself

## Migration from Grav CMS

**Source:** `../eternal` directory (Grav installation)

**Migrate Section:**
```bash
npm run migrate -- --section=04.kingdom --domain=kingdom

# Options
npm run migrate -- --dry-run    # Preview without writing
npm run migrate -- --limit=10   # Migrate first 10 pages only
```

**What It Does:**
* Converts Grav pages to markdown with H1 titles
* Migrates images with intelligent naming
* Generates `_menu.yml` from folder numbering
* Converts internal links to `.md` format
* Excludes `published: false` pages (creates `.draft.md`)

**Output:**
```
Generated 31 pages
- 446 Bible verses detected
- 315 internal links converted
- 13 images migrated
- 3 _menu.yml files generated
```
