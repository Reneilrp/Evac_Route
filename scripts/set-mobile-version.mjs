#!/usr/bin/env node

/**
 * EvacRoute Mobile Version Hub Script
 *
 * Single-command updater that updates all mobile version definitions across:
 * 1. Root Manifest (version.json)
 * 2. Mobile Native Config (frontend/Evac_RouteMobile/app.json)
 * 3. Mobile Package Manifest (frontend/Evac_RouteMobile/package.json)
 * 4. Web Release Hub (frontend/Evac_RouteWeb/src/config/mobileRelease.js)
 *
 * Usage:
 *   node scripts/set-mobile-version.mjs <new-version> [apk-size] [release-month-year]
 *
 * Example:
 *   node scripts/set-mobile-version.mjs 1.3.0 "152 MB" "December 2026"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const newVersion = args[0]?.trim()?.replace(/^v/, '');
const newFileSize = args[1]?.trim();
const newReleaseDate = args[2]?.trim();

if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: Please provide a valid semantic version (e.g. 1.2.1, 1.3.0).');
  console.log('\nUsage:');
  console.log('  node scripts/set-mobile-version.mjs <version> [apk-size] [release-date]');
  console.log('Example:');
  console.log('  node scripts/set-mobile-version.mjs 1.3.0 "150 MB" "December 2026"\n');
  process.exit(1);
}

const paths = {
  rootVersion: path.join(rootDir, 'version.json'),
  mobileAppJson: path.join(rootDir, 'frontend', 'Evac_RouteMobile', 'app.json'),
  mobilePkgJson: path.join(rootDir, 'frontend', 'Evac_RouteMobile', 'package.json'),
  webReleaseConfig: path.join(rootDir, 'frontend', 'Evac_RouteWeb', 'src', 'config', 'mobileRelease.js'),
};

console.log(`\n🚀 \x1b[36mSynchronizing Mobile Version to v${newVersion}...\x1b[0m\n`);

// 1. Read & Update mobile app.json
let currentVersionCode = 8;
if (fs.existsSync(paths.mobileAppJson)) {
  const appJson = JSON.parse(fs.readFileSync(paths.mobileAppJson, 'utf8'));
  const existingVersion = appJson.expo?.version;
  const existingCode = appJson.expo?.android?.versionCode || 8;
  currentVersionCode = existingVersion === newVersion ? existingCode : existingCode + 1;
  appJson.expo.version = newVersion;
  if (!appJson.expo.android) appJson.expo.android = {};
  appJson.expo.android.versionCode = currentVersionCode;

  fs.writeFileSync(paths.mobileAppJson, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log(`  ✅ \x1b[32mfrontend/Evac_RouteMobile/app.json\x1b[0m (version: ${newVersion}, versionCode: ${currentVersionCode})`);
}

// 2. Read & Update mobile package.json
if (fs.existsSync(paths.mobilePkgJson)) {
  const pkgJson = JSON.parse(fs.readFileSync(paths.mobilePkgJson, 'utf8'));
  pkgJson.version = newVersion;
  fs.writeFileSync(paths.mobilePkgJson, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  console.log(`  ✅ \x1b[32mfrontend/Evac_RouteMobile/package.json\x1b[0m (version: ${newVersion})`);
}

// 3. Read & Update Root version.json
let rootConfig = {};
if (fs.existsSync(paths.rootVersion)) {
  try {
    rootConfig = JSON.parse(fs.readFileSync(paths.rootVersion, 'utf8'));
  } catch (e) {
    rootConfig = {};
  }
}

const resolvedFileSize = newFileSize || rootConfig.fileSize || '149 MB';
const resolvedReleaseDate = newReleaseDate || rootConfig.releaseDate || 'November 2026';

const updatedRootConfig = {
  ...rootConfig,
  appName: rootConfig.appName || 'EvacRoute Mobile',
  version: newVersion,
  versionCode: currentVersionCode,
  versionTag: `v${newVersion}`,
  apkFileName: rootConfig.apkFileName || 'EvacRoute.apk',
  fileSize: resolvedFileSize,
  minAndroid: rootConfig.minAndroid || 'Android 8.0+ (Oreo)',
  releaseDate: resolvedReleaseDate,
  releaseChannel: rootConfig.releaseChannel || 'Production Stable',
};
fs.writeFileSync(paths.rootVersion, JSON.stringify(updatedRootConfig, null, 2) + '\n', 'utf8');
console.log(`  ✅ \x1b[32mversion.json\x1b[0m (Root Manifest updated)`);

// 4. Update Web mobileRelease.js
const webConfigContent = `/**
 * Web Hub: Mobile App Release Configuration & Metadata
 *
 * Single source of truth for the mobile APK download links, version tags,
 * file sizes, and release metadata across the web landing page and admin portal.
 * Automatically synchronized via scripts/set-mobile-version.mjs
 */
export const MOBILE_APP_CONFIG = {
  version: '${newVersion}',
  versionTag: 'v${newVersion}',
  versionCode: ${currentVersionCode},
  fileSize: '${resolvedFileSize}',
  apkFileName: '${updatedRootConfig.apkFileName}',
  downloadPath: '/downloads/${updatedRootConfig.apkFileName}',
  minAndroid: '${updatedRootConfig.minAndroid}',
  releaseDate: '${resolvedReleaseDate}',
  releaseChannel: '${updatedRootConfig.releaseChannel}',
};

export default MOBILE_APP_CONFIG;
`;

fs.writeFileSync(paths.webReleaseConfig, webConfigContent, 'utf8');
console.log(`  ✅ \x1b[32mfrontend/Evac_RouteWeb/src/config/mobileRelease.js\x1b[0m (web landing & admin hub updated)`);

console.log(`\n🎉 \x1b[1m\x1b[32mSUCCESS: All screens in Web and Mobile are now locked to v${newVersion} (Build #${currentVersionCode})!\x1b[0m\n`);
