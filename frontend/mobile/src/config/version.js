import appConfig from '../../app.json';

/**
 * Mobile Version Hub
 * Single source of truth for the mobile application version and build metadata.
 * Automatically synchronizes with app.json (used by EAS Cloud Build and Expo CLI).
 */
export const APP_VERSION = appConfig.expo?.version || '1.3.1';
export const APP_BUILD_NUMBER = appConfig.expo?.android?.versionCode || 14;
export const APP_VERSION_TAG = `v${APP_VERSION}`;
export const APP_FULL_VERSION = `EVAC_ROUTE MOBILE • ${APP_VERSION_TAG}`;
export const APP_NAME = appConfig.expo?.name || 'Evac_RouteMobile';

export default {
  version: APP_VERSION,
  buildNumber: APP_BUILD_NUMBER,
  tag: APP_VERSION_TAG,
  fullVersionString: APP_FULL_VERSION,
  name: APP_NAME,
};
