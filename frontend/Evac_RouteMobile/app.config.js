import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      mapboxToken: process.env.MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || null,
      apiBaseUrl: process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api',
      reverbKey:    process.env.REVERB_APP_KEY  || process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'evac-route-key',
      reverbHost:   process.env.REVERB_HOST     || process.env.EXPO_PUBLIC_ECHO_HOST || 'localhost',
      reverbPort:   parseInt(process.env.REVERB_PORT || process.env.EXPO_PUBLIC_ECHO_PORT || '8080', 10),
      reverbScheme: process.env.REVERB_SCHEME   || process.env.EXPO_PUBLIC_ECHO_SCHEME || 'http',
    },
  };
};
