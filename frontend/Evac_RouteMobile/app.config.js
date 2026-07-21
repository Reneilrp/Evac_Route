import 'dotenv/config';

export default ({ config }) => {
  const mapboxPublicToken =
    process.env.MAPBOX_TOKEN ||
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
    '';

  const mapboxDownloadToken =
    process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ||
    process.env.MAPBOX_DOWNLOADS_TOKEN ||
    process.env.EXPO_PUBLIC_MAPBOX_DOWNLOADS_TOKEN ||
    '';

  if (mapboxDownloadToken) {
    process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = mapboxDownloadToken;
  }

  return {
    ...config,
    plugins: [
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      'expo-sqlite',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow Evac_Route to access your location to calculate evacuation routes.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow Evac_Route to access your camera to scan QR codes for resident check-ins.',
        },
      ],
      'expo-notifications',
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsImpl: 'mapbox',
        },
      ],
    ],
    extra: {
      ...(config.extra || {}),
      mapboxToken: mapboxPublicToken,
      apiBaseUrl:
        process.env.API_BASE_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'http://localhost:8000/api',
      reverbKey:
        process.env.REVERB_APP_KEY ||
        process.env.EXPO_PUBLIC_REVERB_APP_KEY ||
        'evac-route-key',
      reverbHost:
        process.env.REVERB_HOST ||
        process.env.EXPO_PUBLIC_ECHO_HOST ||
        'localhost',
      reverbPort: parseInt(
        process.env.REVERB_PORT || process.env.EXPO_PUBLIC_ECHO_PORT || '8080',
        10
      ),
      reverbScheme:
        process.env.REVERB_SCHEME ||
        process.env.EXPO_PUBLIC_ECHO_SCHEME ||
        'http',
    },
  };
};

