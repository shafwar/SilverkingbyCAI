const path = require('path');
const fs = require('fs');

/**
 * Next.js output: "standalone" does NOT bundle .next/static or public automatically.
 * When running server.js in standalone mode, Next.js expects:
 * - .next/standalone/.next/static
 * - .next/standalone/public
 * Without these, all CSS and JS chunks return 404, causing the site to render unstyled.
 */
function copyStandaloneAssets() {
  const rootDir = process.cwd();
  const standaloneDir = path.join(rootDir, '.next', 'standalone');

  if (!fs.existsSync(standaloneDir)) {
    console.log('ℹ️ Standalone directory does not exist, skipping asset copy.');
    return;
  }

  // 1. Copy .next/static to .next/standalone/.next/static
  const srcStatic = path.join(rootDir, '.next', 'static');
  const destStatic = path.join(standaloneDir, '.next', 'static');

  if (fs.existsSync(srcStatic)) {
    console.log('📦 Copying .next/static to .next/standalone/.next/static...');
    fs.mkdirSync(path.dirname(destStatic), { recursive: true });
    fs.cpSync(srcStatic, destStatic, { recursive: true });
    console.log('✅ Static assets copied successfully!');
  } else {
    console.warn('⚠️ .next/static not found.');
  }

  // 2. Copy public to .next/standalone/public
  const srcPublic = path.join(rootDir, 'public');
  const destPublic = path.join(standaloneDir, 'public');

  if (fs.existsSync(srcPublic)) {
    console.log('📦 Copying public to .next/standalone/public...');
    fs.cpSync(srcPublic, destPublic, { recursive: true });
    console.log('✅ Public assets copied successfully!');
  } else {
    console.warn('⚠️ public folder not found.');
  }
}

copyStandaloneAssets();
