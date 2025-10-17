import { defineCollection, defineContentConfig } from '@nuxt/content'
import path from 'path'

// Multi-domain content selection via CONTENT environment variable
const contentDomain = process.env.CONTENT
if (!contentDomain) {
  throw new Error('CONTENT environment variable is required. Set it to: ofgod, kingdom, church, son, or word')
}

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: {
        cwd: path.resolve(`content/${contentDomain}`),
        include: '**/*.md',
        exclude: ['**/*.draft.md'],
        prefix: '/'
      }
    })
  }
})