---
description: Review content article for quality and conformance to project specifications
---

Review the article specified by the user for quality and conformance to project specifications. If no path is provided, ask the user which article to review.

Think before creating a plan to improve the article content. Follow this plan carefully to ensure you do not miss a step.

## Immediate fixes

Fix the following problems immediately without asking the user:

- [ ] The first line of the article content (after the frontmatter) contains an H1 title as first heading
- [ ] There are 1 and only 1 H1 title in the article
- [ ] Convert underscore markdown headers `-------` to hashed headers prefixed with `##`
- [ ] Frontmatter minimal (no title/published/navigation fields)
- [ ] File extension: .md for published, .draft.md for unpublished
- [ ] Internal links use .md extension: `[text](/content/path/page.md)`
- [ ] Links are absolute paths from the project root, for example `/content/church/history/page.md`
- [ ] Do not modify external links
- [ ] Fragments preserved: `/page.md#anchor`
- [ ] Images co-located in same directory as markdown, unless it links to an external website
- [ ] Image naming: `{page}.{descriptor}.{ext}` (avoid duplication if the image has the same name as the page, for example `church.church.jpg`
- [ ] Alt text provided for accessibility
- [ ] Bible verses contains the full bible book name, for example: `John 3:16 (ESV)`
- [ ] Shorthand notation correct: `John 14:16,26` (full reference first)
- [ ] Bible verses of different books are separated by semi-colons `;`, for example: `Genesis 1; Exodus 1:1; Leviticus 1`
- [ ] Bible verses of the same book but different chapters are separated by a comma and a space `, ` for example `Genesis 1:1, 2:1, 3:1`
- [ ] Bible verses of the same book and chapter are separated by a comma only `,` (without spaces) for example `Genesis 1:1-3,5-7,11,13`
- [ ] Markdown linter compliant
- [ ] Fix grammar and spelling errors, **except** in quoted text which should be quoted as-is
- [ ] Logical heading hierarchy (no skipped levels)
- [ ] Tables use standard markdown
- [ ] Blockquotes use standard markdown
- [ ] If in _menu.yml, verify slug format: `.` for local, `/path` for absolute
- [ ] Summarize the article in one or two sentences in the `description` field of the frontmatter.
- [ ] Update the `keywords` field of the frontmatter with sensible keywords related to the content of this article. Use unique keywords that would make this article stand out among other articles. Avoid using common or generic terms as keywords.

## Warnings

Prompt the user about each warning detected and ask the user if it should be corrected or ignored.

- [ ] No broken internal links (verify target files exist)
- [ ] Check if page of external links exist and contains the content the link suggest to provide
- [ ] If multiple pages in directory, verify _menu.yml exists
- [ ] Check that bible verses are quoted correctly from the bible
- [ ] Check that the correct bible verses was referenced by comparing the context/sentence in which the bible verse appear. For example `Jesus said love your enemies (Genesis 1:1)` is wrong because that is not what Genesis 1:1 says.
- [ ] Check that the author's sentences are readable without unnecessary repetitions (except for quoted text)
- [ ] Old Testament bible verses generally refer to `the LORD` with `LORD` in ALL CAPITAL LETTERS and New Testament bible verses generally refer to `the Lord` with only the L of Lord in capital letters.
- [ ] Warn if the author's tone appear arrogant, offensive or divisive. Suggest how sarcasm or rhetorical questions could be rewritten to kind friendly statements or conclusions.
- [ ] Warn about opinions of the author that is not factually proven unless the author specifically says it is his opinion ("I think...", "It seems like...", "Possible interpretations are...")

Report any issues found with specific line numbers and suggested fixes. Provide a summary of conformance and any recommended improvements.

## Recommendations

NEVER MODIFY the article to implement recommendations, but DO provide a recommendation report on how the author could potentially improve his article.

### Style

Only suggest how the following could be improved, unless the user specically ask to change it:

- [ ] Recommend how the author could improve his explanations if it is hard to follow his reasoning
- [ ] Suggest additional evidence like bible scriptures to support the author's statements
- [ ] Suggest links to external websites that support the author's views
- [ ] If the author deviated from the title or description of the article, suggest what content should be moved out of the article.
- [ ] Suggest an introduction (if missing): Introductions should be written in the first person and define the problem that the article intend to address without providing the solution. It should encourage the reader to continue reading to find the solution.
- [ ] The main content of the article that provides the solution to the problem or the evidence for the solution should be written in the third person. It should also contain at least 1 sub-header to separate it from the introduction.
- [ ] The final conclusion should be written in the second person as a mentor that suggest a corrective or possible next action to the reader or how the reader could apply this content to his/her own life. It may contain a rhetorical question at the end to encourage the reader to apply the content to his/her own life like "Are you saved?", "What will you do if...", "How will you contribute...", "Do trust God with...". The final conclusion should also contain 1 and only 1 header to separate it from the main content.
- [ ] Suggest how sections of the article could be shortended without changing the message that the author intend to communicate.

The format of the article should be:

1. Frontmatter (with `description` and `keywords`)
2. H1 Title
3. Problem addressed (1st person)
4. Exploring possible solutions or explanations (3rd person)
5. Conclusion and advise (2nd person)

### Critique

Critically evaluate every statement of the author and recommend how it could be improved:
- [ ] Check for contradictions against the author's own content
- [ ] Check for contradictions against the bible itself (ignore the content of the books of Hebrews and Revelation)
- [ ] Check for reasoning errors or fallacies. The author's evidence should be logically valid
- [ ] Suggest how critiques would respond to this article and what counter arguments they may use against this article.
- [ ] For each counter argument, suggest a potential improvement to address each counter argument of critiques with supporting evidence like common sense, bible scriptures or links to reputable external websites.
