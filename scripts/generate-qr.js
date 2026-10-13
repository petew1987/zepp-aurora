/**
 * QR Code Generator for Zepp OS GitHub Actions Workflow
 * Developed by Stealth Apps
 *
 * Generates terminal ASCII QR codes, PNG QR codes, and Markdown summary
 * formatted with the `zpkd1://` protocol for the Zepp App Developer Mode scanner.
 */

import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

async function main() {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Ensure standard .zab file exists
  const standardZabPath = path.join(distDir, 'zepphello.zab');
  if (!fs.existsSync(standardZabPath)) {
    const foundZab = fs.readdirSync(distDir).find(f => f.endsWith('.zab'));
    if (foundZab) {
      fs.copyFileSync(path.join(distDir, foundZab), standardZabPath);
    }
  }

  // Ensure standard .zpk file exists
  const standardZpkPath = path.join(distDir, 'zepphello.zpk');
  if (!fs.existsSync(standardZpkPath)) {
    const foundZpk = fs.readdirSync(distDir).find(f => f.endsWith('.zpk'));
    if (foundZpk) {
      fs.copyFileSync(path.join(distDir, foundZpk), standardZpkPath);
    }
  }

  const zabStats = fs.existsSync(standardZabPath) ? fs.statSync(standardZabPath) : null;
  const sizeMb = zabStats ? (zabStats.size / (1024 * 1024)).toFixed(2) : '1.0';

  const repo = process.env.GITHUB_REPOSITORY || 'petew1987/ZeppHello';
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';

  const downloadUrlZab = `${serverUrl}/${repo}/releases/latest/download/zepphello.zab`;
  const downloadUrlZpk = `${serverUrl}/${repo}/releases/latest/download/zepphello.zpk`;

  /**
   * ZEPP APP DEVELOPER MODE PROTOCOL:
   * Zepp App expects `zpkd1://` pointing to the .zab bundle installer.
   * The .zab bundle includes manifest.json which the Zepp App unpacks to identify the device.
   */
  const zpkd1UrlZab = `zpkd1://${downloadUrlZab.replace(/^https?:\/\//, '')}`;
  const zpkd1UrlZpk = `zpkd1://${downloadUrlZpk.replace(/^https?:\/\//, '')}`;

  const quickChartZpkd1Zab = `https://quickchart.io/qr?text=${encodeURIComponent(zpkd1UrlZab)}&size=320&margin=2`;

  console.log('\n======================================================');
  console.log('       ZEPP APP DEVELOPER MODE SCANNER QR CODE');
  console.log('       Publisher:  Stealth Apps');
  console.log('       Repository: ' + repo);
  console.log('       Bundle:     zepphello.zab');
  console.log('       Protocol:   zpkd1:// (Recognized by Zepp App)');
  console.log('======================================================\n');
  try {
    const stringQr = await QRCode.toString(zpkd1UrlZab, { type: 'terminal', small: true });
    console.log(stringQr);
  } catch (err) {
    console.warn('Terminal QR error:', err.message);
  }

  console.log(`\nZepp Developer Scheme (.zab): ${zpkd1UrlZab}`);
  console.log(`Direct Package URL:           ${downloadUrlZab}`);
  console.log('======================================================\n');

  // Primary install QR code is .zab bundle
  const qrPngZab = path.join(distDir, 'install-qrcode.png');
  await QRCode.toFile(qrPngZab, zpkd1UrlZab, {
    width: 420,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // Secondary install QR code for single device .zpk
  const qrPngZpk = path.join(distDir, 'install-qrcode-zpk.png');
  await QRCode.toFile(qrPngZpk, zpkd1UrlZpk, {
    width: 420,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  });

  // Write summary to GITHUB_STEP_SUMMARY if running in GitHub Actions
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const summaryMarkdown = `
# ⌚ ZeppHello — Zepp OS Template by Stealth Apps

The Zepp OS application bundle has been built successfully for repository **${repo}**!

---

### 📱 1. Scan to Install via Zepp App Developer Mode

<div align="center">
  <img src="${quickChartZpkd1Zab}" width="280" height="280" alt="Zepp Developer Mode QR Code" />
  <p><strong>Scan with Zepp App &rarr; Profile &rarr; [Watch] &rarr; Developer Mode &rarr; Scanner Icon (top-right)</strong></p>
</div>

---

### 📋 Package & Release Assets

| Resource | Protocol / Link | Details |
| :--- | :--- | :--- |
| **Zepp Developer URL** | \`${zpkd1UrlZab}\` | For Zepp App Developer Mode scanner |
| **Full Bundle (.zab)** | [Download zepphello.zab](${downloadUrlZab}) | Multi-device bundle with manifest (${sizeMb} MB) |
| **Single Target (.zpk)** | [Download zepphello.zpk](${downloadUrlZpk}) | Amazfit Active 3 target package |
| **QR Code Image (PNG)** | [Download install-qrcode.png](${serverUrl}/${repo}/releases/latest/download/install-qrcode.png) | High-res QR file |

---

### 🛠️ GitHub Repository Requirements

1. **Repository Visibility Must Be Public:**
   Zepp App downloads files without authentication. Set repository to Public in **Settings &rarr; Change repository visibility &rarr; Make public**.
2. **Workflow Permissions:**
   Ensure Actions can create releases in **Settings &rarr; Actions &rarr; General &rarr; Workflow permissions &rarr; Read and write permissions**.

*Template maintained by Stealth Apps.*
`;
    fs.appendFileSync(summaryFile, summaryMarkdown);
    console.log('Appended installation QR code and instructions to GITHUB_STEP_SUMMARY');
  }
}

main().catch(err => {
  console.error('Error generating QR code:', err);
  process.exit(1);
});
