Remove the `published` attribute in the frontmatter from the md files by the migration script when the md files are migrated from the old project.

---

Replace all `title` attributes from the frontmatter (including the one in `navigation`) from the md files by the migration script when the md files are migrated from the old project to an H1 header at the first line of the markdown after the front matter. In addition if the markdown document already contained H1 headers indicated by a single `# ` in the beginning a line, then all headers so be prefixed with an additional `#` to move it down 1 level to make space for the new generated H1 header. This also conforms with the markdown linting tools expectations. The nuxt app navigation bar should use this new generated H1 header to determine the title for the menu items (without the `# ` prefix). Also update the TOC to always skips H1 because that will be the page title. Instead the highest level on TOC should be H2. TOC should also always include H3, but never H4 or less.

---

Do not generate `navigation` attributes in the frontmatter with the migration script.

Instead the migration script should generate a menu.yml file in each directory that contains sub-pages. This menu.yml file should indicate the order of the menu items and which page should be excluded from menu items (`.draft.md` files should always be excluded) and which menu items that links to non-local directories should be included as menu items. For example:

```yaml
local-page: # points to local-page.md in the same directory ()
non-local-page: /another/non-local/path # points to /another/non-local/path/non-local-page.md
'External Website': http://another.website.com/some/page
```

The example should produce the following menu items (assuming the md files contain H1 titles "The Local Page" and "The Non-Local Page"):

```
The Local Page
The Non-Local Page
External Website
```
