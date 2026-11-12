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

  // Check if build is for standalone preview/production (physical devices only) or development (includes emulators)
  const isPhysicalOnlyBuild =
    process.env.EAS_BUILD_PROFILE === 'preview' ||
    process.env.EAS_BUILD_PROFILE === 'production' ||
    process.env.APP_ENV === 'preview' ||
    process.env.APP_ENV === 'production';

  const buildPropertiesConfig = isPhysicalOnlyBuild
    ? {
        android: {
          buildArchs: ['armeabi-v7a', 'arm64-v8a', 'x86_64'],
          packagingOptions: {
            exclude: [
              '/lib/x86/**',
            ],
          },
        },
      }
    : {
        android: {
          // Dev builds retain all ABIs so Android Studio / PC emulators run without errors
          buildArchs: ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'],
        },
      };

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
      ['expo-build-properties', buildPropertiesConfig],
    ],
    extra: {
      ...(config.extra || {}),
      mapboxToken: mapboxPublicToken,
      apiBaseUrl:
        process.env.API_BASE_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'https://evacroute.app/api',
      reverbKey:
        process.env.REVERB_APP_KEY ||
        process.env.EXPO_PUBLIC_REVERB_APP_KEY ||
        'evac-route-key',
      reverbHost:
        process.env.REVERB_HOST ||
        process.env.EXPO_PUBLIC_ECHO_HOST ||
        'evacroute.app',
      reverbPort: parseInt(
        process.env.REVERB_PORT || process.env.EXPO_PUBLIC_ECHO_PORT || '443',
        10
      ),
      reverbScheme:
        process.env.REVERB_SCHEME ||
        process.env.EXPO_PUBLIC_ECHO_SCHEME ||
        'https',
    },
  };
};

