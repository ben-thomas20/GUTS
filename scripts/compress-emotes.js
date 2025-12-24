#!/usr/bin/env node

/**
 * Compress and resize GIF emotes to 200x200px
 * Usage: node scripts/compress-emotes.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceDir = path.join(rootDir, 'emotes');
const outputDir = path.join(rootDir, 'frontend', 'public', 'emotes');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all GIF files from source directory
const files = fs.readdirSync(sourceDir)
  .filter(file => file.toLowerCase().endsWith('.gif'))
  .sort(); // Sort alphabetically for consistent ordering

console.log(`Found ${files.length} GIF files to process...`);

let processed = 0;
let errors = 0;

// Process each GIF
for (let i = 0; i < files.length; i++) {
  const inputFile = path.join(sourceDir, files[i]);
  const outputFileName = `emote-${String(i + 1).padStart(2, '0')}.gif`;
  const outputFile = path.join(outputDir, outputFileName);

  try {
    console.log(`Processing ${files[i]} -> ${outputFileName}...`);
    
    await sharp(inputFile, { animated: true })
      .resize(200, 200, {
        fit: 'cover', // Crop to fill 200x200px, no blank space
        position: 'center' // Center the crop area
      })
      .gif({
        effort: 6, // Higher effort for better compression (0-10)
        colors: 256 // Maximum colors for GIF
      })
      .toFile(outputFile);
    
    processed++;
    console.log(`✓ Successfully processed ${outputFileName}`);
  } catch (error) {
    console.error(`✗ Error processing ${files[i]}:`, error.message);
    errors++;
  }
}

console.log(`\n=== Compression Complete ===`);
console.log(`Processed: ${processed}`);
console.log(`Errors: ${errors}`);
console.log(`Output directory: ${outputDir}`);

