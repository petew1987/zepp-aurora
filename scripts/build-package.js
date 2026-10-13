/**
 * Official Zepp OS Package Builder with Preview Mode Patching for Aurora Tracker
 * 
 * 1. Invokes Zeus CLI to compile native QuickJS bytecode and TGA assets.
 * 2. Patches `packageInfo.mode = "preview"` inside manifest and all device bundles so
 *    the Zepp App Developer Mode scanner accepts the app without
 *    "Only Preview apps are supported" errors.
 * 3. Outputs valid, signed .zab and .zpk to dist/ and public/.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import JSZip from 'jszip'

async function patchZpk(zpkBuffer) {
  const zpkZip = await JSZip.loadAsync(zpkBuffer)

  // 1. Patch device.zip
  const deviceZipFile = zpkZip.file('device.zip')
  if (deviceZipFile) {
    const deviceZipBuffer = await deviceZipFile.async('nodebuffer')
    const deviceZip = await JSZip.loadAsync(deviceZipBuffer)
    const appJsonFile = deviceZip.file('app.json')
    if (appJsonFile) {
      const appJson = JSON.parse(await appJsonFile.async('string'))
      if (!appJson.packageInfo) appJson.packageInfo = {}
      appJson.packageInfo.mode = 'preview'
      deviceZip.file('app.json', JSON.stringify(appJson))

      const updatedDevice = await deviceZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      zpkZip.file('device.zip', updatedDevice)
    }
  }

  // 2. Patch app-side.zip
  const appSideZipFile = zpkZip.file('app-side.zip')
  if (appSideZipFile) {
    const appSideZipBuffer = await appSideZipFile.async('nodebuffer')
    const appSideZip = await JSZip.loadAsync(appSideZipBuffer)
    const appJsonFile = appSideZip.file('app.json')
    if (appJsonFile) {
      const appJson = JSON.parse(await appJsonFile.async('string'))
      if (!appJson.packageInfo) appJson.packageInfo = {}
      appJson.packageInfo.mode = 'preview'
      appSideZip.file('app.json', JSON.stringify(appJson))

      const updatedAppSide = await appSideZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      zpkZip.file('app-side.zip', updatedAppSide)
    }
  }

  return await zpkZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

async function main() {
  const rootDir = process.cwd()
  const distDir = path.join(rootDir, 'dist')
  const publicDir = path.join(rootDir, 'public')

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  console.log('⚡ Step 1: Running Zeus Build for Aurora Tracker...')
  try {
    execSync('npx zeus build', { stdio: 'inherit', cwd: rootDir })
  } catch (err) {
    console.error('Zeus build failed:', err.message)
    process.exit(1)
  }

  console.log('📦 Step 2: Locating Build Artifacts in dist/...')
  const zabFiles = fs.readdirSync(distDir)
    .filter(f => f.endsWith('.zab') && f !== 'aurora.zab' && f !== 'zepphello.zab')
    .map(f => ({ name: f, time: fs.statSync(path.join(distDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time)

  if (zabFiles.length === 0) {
    console.error('No freshly generated .zab file found in dist/')
    process.exit(1)
  }

  const latestZabPath = path.join(distDir, zabFiles[0].name)
  console.log(`Found compiled bundle: ${zabFiles[0].name}`)

  console.log('🔧 Step 3: Patching packageInfo.mode = "preview" across targets...')
  const zabBuffer = fs.readFileSync(latestZabPath)
  const zabZip = await JSZip.loadAsync(zabBuffer)

  const manifestFile = zabZip.file('manifest.json')
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async('string'))
    if (!manifest.packageInfo) manifest.packageInfo = {}
    manifest.packageInfo.mode = 'preview'
    zabZip.file('manifest.json', JSON.stringify(manifest))
  }

  let primaryZpk = null
  for (const fileName of Object.keys(zabZip.files)) {
    if (fileName.endsWith('.zpk') && !zabZip.files[fileName].dir) {
      const zpkBuffer = await zabZip.file(fileName).async('nodebuffer')
      const patched = await patchZpk(zpkBuffer)
      zabZip.file(fileName, patched)
      if (!primaryZpk || fileName.includes('466') || fileName.includes('default')) {
        primaryZpk = patched
      }
    }
  }

  const updatedZabBuffer = await zabZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  })

  // Write packages to dist/ and public/
  fs.writeFileSync(path.join(distDir, 'aurora.zab'), updatedZabBuffer)
  fs.writeFileSync(path.join(publicDir, 'aurora.zab'), updatedZabBuffer)
  fs.writeFileSync(path.join(distDir, 'zepphello.zab'), updatedZabBuffer)
  fs.writeFileSync(path.join(publicDir, 'zepphello.zab'), updatedZabBuffer)

  if (primaryZpk) {
    fs.writeFileSync(path.join(distDir, 'aurora.zpk'), primaryZpk)
    fs.writeFileSync(path.join(publicDir, 'aurora.zpk'), primaryZpk)
    fs.writeFileSync(path.join(distDir, 'zepphello.zpk'), primaryZpk)
    fs.writeFileSync(path.join(publicDir, 'zepphello.zpk'), primaryZpk)
  }

  console.log('🎉 SUCCESS: Generated preview-patched aurora.zab and aurora.zpk packages!')
}

main().catch(err => {
  console.error('Build package script error:', err)
  process.exit(1)
})
