/**
 * Script to generate PNG icons from SVG
 * Run: npx tsx scripts/generate-icons.ts
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const PUBLIC_DIR = path.join(import.meta.dirname, '../public')

const icons = [
  { input: 'icon.svg', output: 'icon.png', size: 512 },
  { input: 'icon.svg', output: 'icon-256.png', size: 256 },
  { input: 'icon.svg', output: 'icon-128.png', size: 128 },
  { input: 'tray-icon.svg', output: 'tray-icon.png', size: 16 },
  { input: 'tray-icon.svg', output: 'tray-icon@2x.png', size: 32 },
]

async function generateIcons() {
  console.log('🎨 Generating icons...\n')

  for (const icon of icons) {
    const inputPath = path.join(PUBLIC_DIR, icon.input)
    const outputPath = path.join(PUBLIC_DIR, icon.output)

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${icon.input} (file not found)`)
      continue
    }

    try {
      await sharp(inputPath).resize(icon.size, icon.size).png().toFile(outputPath)

      console.log(`✅ Generated ${icon.output} (${icon.size}x${icon.size})`)
    } catch (error) {
      console.error(`❌ Error processing ${icon.input}:`, error)
    }
  }

  console.log('\n✅ Icon generation complete!')
}

generateIcons()
