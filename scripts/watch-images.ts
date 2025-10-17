#!/usr/bin/env node

import chokidar from 'chokidar'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
const STATIC_FILES = ['favicon.ico', 'robots.txt']
const MENU_FILE = '_menu.yml'

/**
 * Get content domain from environment variable (read at runtime, not import time)
 */
function getContentDomain(): string {
  return process.env.CONTENT || 'ofgod'
}

/**
 * Get source directory for content domain
 */
function getSourceDir(): string {
  return path.resolve(__dirname, '..', 'content', getContentDomain())
}

/**
 * Get target public directory
 */
function getTargetDir(): string {
  return path.resolve(__dirname, '..', 'public')
}

/**
 * Copy all images and menu files from content to public directory (one-time)
 */
export async function copyAllImages() {
  const sourceDir = getSourceDir()
  const targetDir = getTargetDir()

  console.log(`📦 Copying images and menus from: ${sourceDir}`)
  console.log(`📦 Target directory: ${targetDir}`)

  let copiedCount = 0

  // Copy images
  for (const ext of IMAGE_EXTS) {
    const pattern = `${sourceDir}/**/*.${ext}`
    const files = await getAllFiles(sourceDir, ext)

    for (const sourcePath of files) {
      await copyImage(sourcePath, false)
      copiedCount++
    }
  }

  // Copy _menu.yml files
  const menuFiles = await getAllFiles(sourceDir, 'yml')
  for (const sourcePath of menuFiles) {
    if (path.basename(sourcePath) === MENU_FILE) {
      await copyMenuFile(sourcePath, false)
      copiedCount++
    }
  }

  console.log(`✓ Copied ${copiedCount} file(s)\n`)
}

/**
 * Clean public directory except static files
 */
async function cleanPublicDirectory() {
  const targetDir = getTargetDir()

  console.log(`🧹 Cleaning public directory...`)

  if (!await fs.pathExists(targetDir)) {
    return
  }

  const items = await fs.readdir(targetDir)

  for (const item of items) {
    if (!STATIC_FILES.includes(item)) {
      const itemPath = path.join(targetDir, item)
      await fs.remove(itemPath)
      console.log(`  ✗ Removed: ${item}`)
    }
  }

  console.log(`✓ Public directory cleaned\n`)
}

/**
 * Watch images and menu files in content directory and sync to public directory
 */
export async function watchImages() {
  const sourceDir = getSourceDir()
  const targetDir = getTargetDir()

  // Clean public directory first (handles domain switching)
  await cleanPublicDirectory()

  // Copy all existing files BEFORE starting watcher (ensures files are ready)
  await copyAllImages()

  console.log(`👀 Watching images and menus in: ${sourceDir}`)
  console.log(`👀 Target directory: ${targetDir}\n`)

  const patterns = [
    ...IMAGE_EXTS.map(ext => `${sourceDir}/**/*.${ext}`),
    `${sourceDir}/**/${MENU_FILE}`
  ]

  const watcher = chokidar.watch(patterns, {
    persistent: true,
    ignoreInitial: true, // Files already copied above
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  watcher
    .on('add', (filePath) => {
      if (path.basename(filePath) === MENU_FILE) {
        copyMenuFile(filePath, true, 'added')
      } else {
        copyImage(filePath, true, 'added')
      }
    })
    .on('change', (filePath) => {
      if (path.basename(filePath) === MENU_FILE) {
        copyMenuFile(filePath, true, 'updated')
      } else {
        copyImage(filePath, true, 'updated')
      }
    })
    .on('unlink', (filePath) => {
      if (path.basename(filePath) === MENU_FILE) {
        deleteMenuFile(filePath)
      } else {
        deleteImage(filePath)
      }
    })
    .on('error', (error) => console.error(`❌ Watcher error: ${error}`))

  return watcher
}

/**
 * Transform content path to public path (strips domain prefix)
 * Example: /content/kingdom/church/image.jpg → /public/church/image.jpg
 */
function getPublicPath(sourcePath: string): { relativePath: string, targetPath: string } {
  const sourceDir = getSourceDir()
  const targetDir = getTargetDir()
  const contentDir = path.join(sourceDir, '..')
  const relativeFromContent = path.relative(contentDir, sourcePath)
  const pathSegments = relativeFromContent.split(path.sep)
  const relativePath = pathSegments.slice(1).join(path.sep) // Skip domain segment
  const targetPath = path.join(targetDir, relativePath)
  return { relativePath, targetPath }
}

/**
 * Copy a single file from content to public (images or menus)
 */
async function copyFile(
  sourcePath: string,
  fileType: 'Image' | 'Menu',
  log: boolean = true,
  action: string = 'copied'
) {
  try {
    // Check if this is a draft-only image (skip menus, they don't have draft checks)
    if (fileType === 'Image' && await isDraftOnlyImage(sourcePath)) {
      if (log) {
        const fileName = path.basename(sourcePath)
        console.log(`⊗ Skipped draft image: ${fileName}`)
      }
      return
    }

    const { relativePath, targetPath } = getPublicPath(sourcePath)

    await fs.ensureDir(path.dirname(targetPath))
    await fs.copy(sourcePath, targetPath)

    if (log) {
      console.log(`✓ ${fileType} ${action}: ${relativePath}`)
    }
  } catch (error) {
    console.error(`❌ Failed to copy ${sourcePath}:`, error)
  }
}

/**
 * Delete a single file from public directory (images or menus)
 */
async function deleteFile(sourcePath: string, fileType: 'Image' | 'Menu') {
  try {
    // Check if this was a draft-only image (skip menus)
    if (fileType === 'Image' && await isDraftOnlyImage(sourcePath)) {
      const fileName = path.basename(sourcePath)
      console.log(`⊗ Draft image removed from content: ${fileName}`)
      return
    }

    const { relativePath, targetPath } = getPublicPath(sourcePath)

    if (await fs.pathExists(targetPath)) {
      await fs.remove(targetPath)
      console.log(`✗ ${fileType} deleted: ${relativePath}`)
    }
  } catch (error) {
    console.error(`❌ Failed to delete ${sourcePath}:`, error)
  }
}

/**
 * Copy a single image from content to public
 */
async function copyImage(sourcePath: string, log: boolean = true, action: string = 'copied') {
  return copyFile(sourcePath, 'Image', log, action)
}

/**
 * Delete image from public directory
 */
async function deleteImage(sourcePath: string) {
  return deleteFile(sourcePath, 'Image')
}

/**
 * Copy a single _menu.yml file from content to public
 */
async function copyMenuFile(sourcePath: string, log: boolean = true, action: string = 'copied') {
  return copyFile(sourcePath, 'Menu', log, action)
}

/**
 * Delete _menu.yml file from public directory
 */
async function deleteMenuFile(sourcePath: string) {
  return deleteFile(sourcePath, 'Menu')
}

/**
 * Check if an image belongs to a draft-only page (no published .md exists)
 */
async function isDraftOnlyImage(imagePath: string): Promise<boolean> {
  const ext = path.extname(imagePath)
  const fileName = path.basename(imagePath, ext)

  // Extract page prefix from image name (e.g., "something.pic.jpg" → "something")
  const parts = fileName.split('.')
  if (parts.length < 2) {
    // Single-part filename (no prefix) - assume it's a shared image, copy it
    return false
  }

  const pagePrefix = parts[0]
  const imageDir = path.dirname(imagePath)

  // Check if corresponding published .md file exists
  const publishedMdPath = path.join(imageDir, `${pagePrefix}.md`)
  const hasPublishedVersion = await fs.pathExists(publishedMdPath)

  // Check if only draft version exists
  const draftMdPath = path.join(imageDir, `${pagePrefix}.draft.md`)
  const hasDraftVersion = await fs.pathExists(draftMdPath)

  // Skip copying if only draft exists (no published version)
  return !hasPublishedVersion && hasDraftVersion
}

/**
 * Get all files with specific extension recursively
 */
async function getAllFiles(dir: string, ext: string): Promise<string[]> {
  const files: string[] = []

  if (!await fs.pathExists(dir)) {
    return files
  }

  const items = await fs.readdir(dir)

  for (const item of items) {
    const itemPath = path.join(dir, item)
    const stat = await fs.stat(itemPath)

    if (stat.isDirectory()) {
      const subFiles = await getAllFiles(itemPath, ext)
      files.push(...subFiles)
    } else if (item.toLowerCase().endsWith(`.${ext}`)) {
      files.push(itemPath)
    }
  }

  return files
}
