# Document the recent changes in CLAUDE.md and README.md

## CLAUDE.md

For CLAUDE.md be concise so that future language models will be able to follow your instructions.

Keep the following sections in the CLAUDE.md up to date:

* Architecture Decisions: Which problems were addressed and how it was solved
* Project Structure: Where to find what
* Feature Overview: What this project can do and a brief explanation how it was implemented
* Usage Instructions: List of commands, how to use the system
* Production Deployment: How this project should be deploy in production, special commands
* List of recent refactorings (including date/time so that we can clean up old info later)
* Troubleshooting: How to debug the project, view logs, including lessons learned to avoid repeated mistakes (if applicable) 

NEVER change the following sections:

* Coding Rules
* Naming Conventions

ALWAYS:
* Be concise, but include examples when the concept is complex
* Instead of adding new sections, rather update existing ones if they already exist
* Clean up redundant information, outdated information
* Do not update sections in CLAUDE.md which are irrelevant to the recent changes or context.

If you discover contradictions or mistakes in CLAUDE.md: Think carefully about it and find the correct content to update it with.

If CLAUDE.md file size exceed > 40KB, you MUST clean up the CLAUDE.md file according to these clean up rules:
* Remove any irrelevant entries of components or features that no longer exist
* Remove the eldest 20% of memories of past mistakes
* Replace verbose explanations with concise descriptions
* Condense excessive examples

## README.md

Update README.md for human developers (not robots). 

**IMPORTANT**, use the following well organized in main sections particularly in the following order:
  * **Running the project locally**: How to setup the project on a brand new developer machine: 
    * which dependencies to install
    * how to prepare the developer's machine
  * **Content layout**: Guide the users how to write proper content
    * Different DNS domains and how content is separated by different domain directories
    * The expected format of markdown files in the /content directory
    * Supported markdown styles
    * The expected location, naming and format of images used in md files
    * The expected md linking format and rules (internal, absolute, relative, across domains and external websites)
    * Valid fontmatter attributes
    * How to configure navigation menus
  * **Local development setup**: 
    * A step-by-step tutorial on how to setup and run the project locally. Highlight common pitfalls or mistakes the user can make during the setup (exclude recent bug fixes)
    * How to run the tests
  * **Development guidelines**
    * Specifically mention deviations from typical Nuxt setups that are specific to this project (without repeating earlier sections)
    * Coding rules and naming convention

The README.md file should start each section with a very concise TLDR section focusing only on the common or primary commands or configs followed by a detailed explanation and examples with comments.

Always use `#` hashes for headers. Headers should be consistently in: Title Case
Always use `*` for bullet points.  

If the old README.md file becomes outdated, you must update all outdated sections

Keep the README.md file < 60KB.
