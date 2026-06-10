import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      mapboxToken: process.env.MAPBOX_TOKEN || null,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api',
    },
  };
};
