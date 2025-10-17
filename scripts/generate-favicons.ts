#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FAVICON_SIZES = {
  ico: [16, 32],
  appleTouchIcon: 180,
  pwaIcon192: 192,
  pwaIcon512: 512
} as const

/**
 * Generate favicons from SVG logo for a specific domain
 */
export async function generateFavicons(domain: string) {
  const projectRoot = path.resolve(__dirname, '..')
  const logoPath = path.join(projectRoot, 'content', domain, 'logo.svg')
  const faviconDir = path.join(projectRoot, 'content', domain, 'favicon')

  // Check if logo exists
  if (!await fs.pathExists(logoPath)) {
    console.error(`❌ Logo not found: ${logoPath}`)
    return false
  }

  await fs.ensureDir(faviconDir)

  console.log(`🎨 Generating favicons for domain: ${domain}`)
  console.log(`   Source: ${logoPath}`)
  console.log(`   Output: ${faviconDir}`)

  try {
    // Copy SVG as-is (for modern browsers)
    const svgTargetPath = path.join(faviconDir, 'favicon.svg')
    await fs.copy(logoPath, svgTargetPath)
    console.log(`   ✓ SVG: favicon.svg`)

    // Generate ICO (32x32 with transparent padding)
    const icoTargetPath = path.join(faviconDir, 'favicon.ico')
    const png32Buffer = await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer()

    await fs.writeFile(icoTargetPath, png32Buffer)
    console.log(`   ✓ ICO: favicon.ico`)

    // Generate Apple Touch Icon (180x180 with transparent padding)
    const appleTouchPath = path.join(faviconDir, 'apple-touch-icon.png')
    await sharp(logoPath)
      .resize(FAVICON_SIZES.appleTouchIcon, FAVICON_SIZES.appleTouchIcon, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath)
    console.log(`   ✓ Apple Touch Icon: apple-touch-icon.png`)

    // Generate PWA Icon 192x192
    const icon192Path = path.join(faviconDir, 'icon-192.png')
    await sharp(logoPath)
      .resize(FAVICON_SIZES.pwaIcon192, FAVICON_SIZES.pwaIcon192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(icon192Path)
    console.log(`   ✓ PWA Icon 192: icon-192.png`)

    // Generate PWA Icon 512x512
    const icon512Path = path.join(faviconDir, 'icon-512.png')
    await sharp(logoPath)
      .resize(FAVICON_SIZES.pwaIcon512, FAVICON_SIZES.pwaIcon512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(icon512Path)
    console.log(`   ✓ PWA Icon 512: icon-512.png`)

    console.log(`✅ Favicons generated successfully for ${domain}\n`)
    return true
  } catch (error) {
    console.error(`❌ Failed to generate favicons for ${domain}:`, error)
    return false
  }
}

/**
 * Copy favicon files from content submodule to public directory
 */
export async function copyFaviconsToPublic(domain: string) {
  const projectRoot = path.resolve(__dirname, '..')
  const faviconDir = path.join(projectRoot, 'content', domain, 'favicon')
  const publicDir = path.join(projectRoot, 'public')

  console.log(`📋 Copying ${domain} favicons to public...`)

  const files = [
    'favicon.svg',
    'favicon.ico',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png'
  ]

  for (const file of files) {
    const sourcePath = path.join(faviconDir, file)
    const targetPath = path.join(publicDir, file)

    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath)
      console.log(`   ✓ ${file}`)
    } else {
      console.warn(`   ⚠ Missing: ${file}`)
    }
  }

  console.log(`✅ Favicon copy complete\n`)
}

/**
 * Generate web manifest for PWA support
 */
export async function generateWebManifest(domain: string, name: string) {
  const projectRoot = path.resolve(__dirname, '..')
  const publicDir = path.join(projectRoot, 'public')
  const manifestPath = path.join(publicDir, 'site.webmanifest')

  const manifest = {
    name: name,
    short_name: name,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone'
  }

  await fs.writeJson(manifestPath, manifest, { spaces: 2 })
  console.log(`📱 Web manifest generated: site.webmanifest\n`)
}

/**
 * CLI execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const domain = process.env.CONTENT || 'ofgod'

  // Domain name mapping
  const domainNames: Record<string, string> = {
    ofgod: 'Our Father God',
    kingdom: 'The Kingdom of God',
    son: 'The Son of God',
    church: 'The Church of God',
    word: 'The Word of God'
  }

  const name = domainNames[domain] || domain

  ;(async () => {
    const success = await generateFavicons(domain)
    if (success) {
      await copyFaviconsToPublic(domain)
      await generateWebManifest(domain, name)
    } else {
      process.exit(1)
    }
  })()
}
