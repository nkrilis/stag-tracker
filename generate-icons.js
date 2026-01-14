import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [192, 512];
const publicDir = path.join(__dirname, 'public');

async function generateIcons() {
  for (const size of sizes) {
    const svgPath = path.join(publicDir, `icon-${size}.svg`);
    const pngPath = path.join(publicDir, `icon-${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`Generated ${pngPath}`);
    } catch (error) {
      console.error(`Error generating icon-${size}.png:`, error);
    }
  }
}

generateIcons().then(() => {
  console.log('All icons generated successfully!');
}).catch((error) => {
  console.error('Error generating icons:', error);
});
