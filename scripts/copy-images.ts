#!/usr/bin/env node

import { copyAllImages } from './watch-images.js'

async function main() {
  try {
    console.log('🚀 Starting image copy process...\n')
    await copyAllImages()
    console.log('✅ Image copy complete!')
  } catch (error) {
    console.error('❌ Image copy failed:', error)
    process.exit(1)
  }
}

main()
