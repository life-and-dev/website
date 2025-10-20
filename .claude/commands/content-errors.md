---
description: Fix article content errors
---

Review the article specified by the user for quality and conformance to project specifications. If no path is provided, ask the user which article to review.

Fix the following problems:

- [ ] The first line of the article content (after the frontmatter) contains an H1 title as first heading
- [ ] There are 1 and only 1 H1 title in the article
- [ ] Convert underscore markdown headers `-------` to hashed headers prefixed with `##`
- [ ] Convert ` -- ` double hyphens that are surrounded by spaces, to a single em dash (keep the spaces around the em dash).
- [ ] Frontmatter minimal (no title/published/navigation fields)
- [ ] File extension: .md for published, .draft.md for unpublished
- [ ] Ensure that markdown links within the same document to anchors/headers are valid, for example `#some-header-in-same-doc`
- [ ] Internal links use .md extension: `[text](/content/path/page.md)`
- [ ] Links are absolute paths from the project root, for example `/content/church/history/page.md`
- [ ] Do not modify external links
- [ ] Fragments preserved: `/page.md#anchor`
- [ ] Images co-located in same directory as markdown, unless it links to an external website
- [ ] Image naming: `{page}.{descriptor}.{ext}` (avoid duplication if the image has the same name as the page, for example `church.church.jpg`)
- [ ] Alt text provided for accessibility
- [ ] Bible verses contains the full bible book name, for example: `John 3:16 (ESV)`
- [ ] Shorthand notation correct: `John 14:16,26` (full reference first)
- [ ] Bible verses of different books are separated by semi-colons `;`, for example: `Genesis 1; Exodus 1:1; Leviticus 1`
- [ ] Bible verses of the same book but different chapters are separated by a comma and a space `, ` for example `Genesis 1:1, 2:1, 3:1`
- [ ] Bible verses of the same book and chapter are separated by a comma only `,` (without spaces) for example `Genesis 1:1-3,5-7,11,13`. If now colon `:` was included, you may assume the number means a verse of the previous chapter, for example `Genesis 1:1,3` means Genesis 1:1 and Genesis 1:3
- [ ] Markdown linter compliant
- [ ] Fix grammar and spelling errors. **NEVER** fix grammar errors in quoted text. Quoted text should be kept quoted as-is even if the grammar in the quoted text is wrong
- [ ] Logical heading hierarchy (no skipped levels)
- [ ] Tables use standard markdown
- [ ] Blockquotes use standard markdown
- [ ] If in _menu.yml, verify slug format: `.` for local, `/path` for absolute
- [ ] Summarize the article in one or two sentences in the `description` field of the frontmatter.
- [ ] The article description will be used as a meta tag element that describes the page for SEO. Insure that it is search engine compliant and not longer than 160 characters.
- [ ] Update the `keywords` field of the frontmatter with sensible keywords related to the content of this article. Use unique keywords that would make this article stand out among other articles. Avoid using common or generic terms as keywords.
