/**
 * Patch Zepp OS Packages to Preview Mode
 *
 * Zeus CLI's `zeus build` compiles full bytecode and assets, but stamps
 * packageInfo.mode as "production". The Zepp App Developer Mode scanner
 * strictly checks that packageInfo.mode === "preview" and rejects production
 * builds with "Only Preview apps are supported".
 *
 * This script updates packageInfo.mode to "preview" in all compiled packages:
 * - Inside device.zip/app.json within each .zpk
 * - Inside the root .zab bundle
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function patchZipAppJson(zipBuffer) {
  const zip = await JSZip.loadAsync(zipBuffer);
  let modified = false;

  // 1. Direct app.json in this zip
  const appJsonFile = zip.file('app.json');
  if (appJsonFile) {
    try {
      const content = await appJsonFile.async('text');
      const parsed = JSON.parse(content);
      parsed.packageInfo = parsed.packageInfo || {};
      parsed.packageInfo.mode = 'preview';
      // Set timestamp and expiry (30 days)
      parsed.packageInfo.timeStamp = Math.round(Date.now() / 1000);
      parsed.packageInfo.expiredTime = 2592000;
      zip.file('app.json', JSON.stringify(parsed));
      modified = true;
    } catch (e) {
      console.warn('Could not patch app.json:', e);
    }
  }

  // 2. Nested device.zip in this zip (common in .zpk files)
  const deviceZipFile = zip.file('device.zip');
  if (deviceZipFile) {
    const deviceBuffer = await deviceZipFile.async('nodebuffer');
    const patchedDeviceBuffer = await patchZipAppJson(deviceBuffer);
    zip.file('device.zip', patchedDeviceBuffer);
    modified = true;
  }

  // 3. Nested .zpk files in this zip (common in .zab bundles)
  const zpkFiles = Object.keys(zip.files).filter(name => name.endsWith('.zpk'));
  for (const zpkName of zpkFiles) {
    const zpkBuffer = await zip.file(zpkName).async('nodebuffer');
    const patchedZpkBuffer = await patchZipAppJson(zpkBuffer);
    zip.file(zpkName, patchedZpkBuffer);
    modified = true;
  }

  if (modified) {
    return await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
  }
  return zipBuffer;
}

export async function patchAllPackages() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  const targets = [
    path.join(distDir, 'zepphello.zab'),
    path.join(distDir, 'zepphello.zpk'),
    path.join(publicDir, 'zepphello.zab'),
    path.join(publicDir, 'zepphello.zpk')
  ];

  for (const targetPath of targets) {
    if (fs.existsSync(targetPath)) {
      console.log(`🔧 Patching ${path.relative(rootDir, targetPath)} to preview mode...`);
      const original = fs.readFileSync(targetPath);
      const patched = await patchZipAppJson(original);
      fs.writeFileSync(targetPath, patched);
      console.log(`✅ Patched ${path.relative(rootDir, targetPath)}`);
    }
  }
}

if (process.argv[1]?.endsWith('patch-preview-mode.js')) {
  patchAllPackages().catch(err => {
    console.error('Patch error:', err);
    process.exit(1);
  });
}
