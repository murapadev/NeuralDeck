// Script para generar iconos PNG desde SVG
// Ejecutar: npx ts-node scripts/generate-icons.ts

import { existsSync } from 'fs'
import path from 'path'

const PUBLIC_DIR = path.join(__dirname, '../public')

const icons = [
  { input: 'icon.svg', output: 'icon.png', size: 512 },
  { input: 'tray-icon.svg', output: 'tray-icon.png', size: 16 },
  { input: 'tray-icon.svg', output: 'tray-icon@2x.png', size: 32 },
]

console.log('🎨 Generating icons...\n')

for (const icon of icons) {
  const inputPath = path.join(PUBLIC_DIR, icon.input)
  const outputPath = path.join(PUBLIC_DIR, icon.output)

  if (!existsSync(inputPath)) {
    console.log(`⚠️  Skipping ${icon.input} (file not found)`)
    continue
  }

  try {
    // Usando sharp si está disponible, o indicando cómo generar manualmente
    console.log(`📝 To generate ${icon.output}:`)
    console.log(`   - Open ${icon.input} in a browser or image editor`)
    console.log(`   - Export as PNG at ${icon.size}x${icon.size}px`)
    console.log(`   - Save to public/${icon.output}\n`)
  } catch (error) {
    console.error(`❌ Error processing ${icon.input}:`, error)
  }
}

console.log('✅ Icon generation instructions complete!')
console.log('\nAlternatively, install sharp and run:')
console.log('npm install sharp')
console.log('npx ts-node scripts/generate-icons.ts')
