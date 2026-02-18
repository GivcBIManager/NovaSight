/**
 * Generate PWA icons from favicon.svg
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required by manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384];

async function generateIcons() {
  // Dynamically import sharp (after installation)
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp not found. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const publicDir = path.join(__dirname, '..', 'public');
  const iconsDir = path.join(publicDir, 'icons');
  const svgPath = path.join(publicDir, 'favicon.svg');

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('Created icons directory');
  }

  // Read the SVG
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate each icon size
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
