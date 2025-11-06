Scan the article for these keywords listed below and replace the first instance of every keyword in every main section of the article to a markdown link of that article. Markdown links should use relative links for articles within the same /content/{domain} directory structure but use absolute links to articles that exist in different /content/{domain} directories. For example the article /content/son/nature.md would create a relative link like [Son of Man](son-of-man.md) which exist in /content/son/son-of-man.md because both are published in the `son` domain. The same is also true for articles is sub-directories of /content/son/... However, /content/son/nature.md would require an absolute link to /content/word/downloads.md like [Download the Word of God](https://word.ofgod.info/downloads) because these are articles will be published in different domains namely `son` and `word`. Note that absolute links truncate the `.md` extensions as these routes will automatically be translated to the correct md file once published. Relative links should include the `.md` file extensions.

Homepages of domain are named `index.md` in relative links but omitted in absolute links. For example the homepage found at /content/son/index.md would be linked as `index.md` in relative links inside the `son` domain but `https://son.ofgod.info` in absolute links (only the base URL).

The following domains exist:

# Domain Table

| directory | published domain           |
|-----------|----------------------------|
| ofgod     | https://ofgod.info         |
| son       | https://son.ofgod.info     |
| kingdom   | https://kingdom.ofgod.info |
| church    | https://church.ofgod.info  |
| word      | https://word.ofgod.info    |

Here is the table of keywords to scan in the article. Make sure the keyword is used in the context described next to it before creating the link.

# Keyword-Article Mapping Table

| keywords                          | context of the keyword                                     | target md file                |
|-----------------------------------|------------------------------------------------------------|-------------------------------|
| Angel of God, Archangel, Michael  | Referring to Jesus as the Angel of the Lord                | /content/son/son-as-angel.md  |
| Bible                             | Referring to the Christian Bible                           | /content/word.md              |
| Kingdom of God, Kingdom of Heaven | Community of believers, God, angels                        | /content/kingdom/index.md     |
| Shema                             | Teaching that only 1 God exist                             | /content/son/shema.md         |
| Son as God                        | Jesus or Christ being referred to as God                   | /content/son/son-as-god.md    |
| Son of God                        | Jesus or Christ being referred to as divine                | /content/son/index.md         |
| Son of Man                        | Jesus or Christ being referred to as a human               | /content/son/son-of-man.md    |
| church                            | Traditional Christian church system                        | /content/chuch/index.md       |
| darkness                          | being deceived / living according to sin                   | /content/kingdom/darkness.md  |
| light                             | the teaching of God or Jesus                               | /content/kingdom/light.md     |
| parables                          | parables told by Jesus                                     | /content/kingdom/parables.md  |
| the Father                        | God the Father                                             | /content/ofgod/index.md       |
| the Word                          | Referring to Jesus                                         | /content/son/word.md          |
| translations                      | Referring to Bible translations                            | /content/word/translations.md |
| trinity                           | Trinitarian doctrine of the Father, the Son and the Spirit | /content/son/trinity.md       |

## Examples

For example if the text exist in the article `/content/church/article.md`:

```md
The Shema is a Jewish Prayer that highlight that they worship only one God.
```

The keyword `Shema` should match and convert the text to:

```md
The [Shema](https://son.ofgod.info/shema) is a Jewish Prayer that highlight that they worship only one God.
```

Because `Shema` link to `/content/son/shema.md`. `church` and `son` is not the same domain so we need to create an absolute link to the `son` domain which according to the above table link to `https://son.ofgod.info`. Absolute paths strip the `.md` extension so the full path will be `https://son.ofgod.info/shema`.

# Post Update

If the article file path does not exist in the "target md file" column of the above Keyword-Article Mapping Table, add an entry with a unique keyword, context of the keyword and include a link to the article md file.
