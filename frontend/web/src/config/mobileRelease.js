/**
 * Web Hub: Mobile App Release Configuration & Metadata
 *
 * Single source of truth for the mobile APK download links, version tags,
 * file sizes, and release metadata across the web landing page and admin portal.
 * Automatically synchronized via scripts/set-mobile-version.mjs
 */
export const MOBILE_APP_CONFIG = {
  version: '1.2.4',
  versionTag: 'v1.2.4',
  versionCode: 12,
  fileSize: '149 MB',
  apkFileName: 'EvacRoute.apk',
  downloadPath: '/downloads/EvacRoute.apk',
  minAndroid: 'Android 8.0+ (Oreo)',
  releaseDate: 'November 2026',
  releaseChannel: 'Production Stable',
};

export default MOBILE_APP_CONFIG;
