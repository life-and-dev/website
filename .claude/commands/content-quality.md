---
description: Improve content article quality
---

Review the article specified by the user for quality and conformance to project specifications. If no path is provided, ask the user which article to review.

Think before creating a plan to improve the article content. Follow this plan carefully to ensure you do not miss a step.

Prompt the user about each problem detected and ask the user if it should be corrected or ignored. If the user choose skip, mark that problem resolved and continue with the next problem.

## Warnings

- [ ] No broken internal links (verify target files exist)
- [ ] Check if page of external links exist and contains the content the link suggest to provide, except for links to https://eternal.family.net.za which need to verification because it is the original website (we are gradually migrating content from that website and it all will eventually become internal links, so multiple links to that website is acceptable)
- [ ] Check that bible verses are quoted correctly from the bible
- [ ] Check that the correct bible verses was referenced by comparing the context/sentence in which the bible verse appear. For example `Jesus said love your enemies (Genesis 1:1)` is wrong because that is not what Genesis 1:1 says.
- [ ] Check that the author's sentences are readable without unnecessary repetitions (except for quoted text)
- [ ] Old Testament bible verses generally refer to `the LORD` with `LORD` in ALL CAPITAL LETTERS and New Testament bible verses generally refer to `the Lord` with only the L of Lord in capital letters.
- [ ] Warn if the author's tone appear arrogant, offensive or divisive. Suggest how sarcasm or rhetorical questions could be rewritten to kind friendly statements or conclusions.
- [ ] Warn about opinions of the author that is not factually proven unless the author specifically says it is his opinion ("I think...", "It seems like...", "Possible interpretations are...")

Report any issues found with specific line numbers and suggested fixes. Provide a summary of conformance and any recommended improvements.

Ignore grammar errors in quoted text.

Avoid using em dashes (—) or en dashes (–) in sentences. Rather use multiple short sentences with periods `.` that flow into each other.

## Recommendations

Prompt the user with one or more suggestions how you would have rewritten problematic sections and ask the user if it should be corrected or ignored. If the user choose skip, mark that problem resolved and continue with the next problem.

### Style

Only suggest how the following could be improved, unless the user specically ask to change it:

- [ ] Recommend how the author could improve his explanations if it is hard to follow his reasoning
- [ ] Suggest additional evidence like bible scriptures to support the author's statements
- [ ] Suggest links to external websites that support the author's views
- [ ] If the author deviated from the title or description of the article, suggest what content should be moved out of the article.
- [ ] Suggest how sections of the article could be shortended without changing the message that the author intend to communicate.

### Critique

Critically evaluate every statement of the author and recommend how it could be improved:
- [ ] Check for contradictions against the author's own content
- [ ] Check for contradictions against the bible itself (ignore the content of the books of Hebrews and Revelation)
- [ ] Check for reasoning errors or fallacies. The author's evidence should be logically valid
- [ ] Suggest how critiques would respond to this article and what counter arguments they may use against this article.
- [ ] For each counter argument, suggest a potential improvement to address each counter argument of critiques with supporting evidence like common sense, bible scriptures or links to reputable external websites.
