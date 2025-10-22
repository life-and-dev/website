---
description: Change the article style to academical. Use this style to objectively discuss or explain a topic. Useful to present facts to the reader.
---

Convert the article specified by the user to academical style. If no path is provided, ask the user which article to convert.

Think before creating a plan to convert the article style. Follow this plan carefully to ensure you do not miss a step.

Only suggest how the following could be improved, unless the user specifically asks to change it:

- [ ] Suggest an introduction (if missing): Introductions should make it clear what is the purpose of this article.
- [ ] The main content of the article should not deviate from the purpose of the article.
- [ ] The main content should be sub-divided into H2 headers if the content is very long.
- [ ] The final conclusion should summarize the content of the article.
- [ ] The entire article should be written in the third person, except quoted text should never be changed. Avoid phrases like "I think...", "We believe...", "You should..."

The format of the article should be:

1. Frontmatter (with `description` and `keywords`)
2. H1 Title
3. Introduction
4. Main content
5. Conclusion

## Avoid

- NEVER change quoted text
- NEVER change the meaning of the text, unless the user explicitly asked to do so
- Avoid using em dashes (—) or en dashes (–) in sentences. Rather use multiple short sentences with periods `.` that flow into each other.
