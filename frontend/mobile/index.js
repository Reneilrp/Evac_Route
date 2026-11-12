import { registerRootComponent } from 'expo';

import Mapbox from '@rnmapbox/maps';
import App from './App';
import { MAPBOX_PUBLIC_TOKEN } from './src/utils/zamboangaGeo';

// Set Mapbox access token at the root before any views mount
if (MAPBOX_PUBLIC_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
    Mapbox.setTelemetryEnabled(false);
  } catch (err) {
    console.warn('[Mapbox] Root token initialization error:', err);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
