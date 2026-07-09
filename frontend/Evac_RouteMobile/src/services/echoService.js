import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import Constants from 'expo-constants';

/**
 * Singleton Laravel Echo instance connected to the Laravel Reverb WebSocket server.
 * Lazily initialised on first call to getEcho() so the connection is only made
 * after the app has fully bootstrapped (avoids premature connection before auth).
 */
let echo = null;

/**
 * Returns the shared Echo instance, creating it if it doesn't exist yet.
 * All screens that need real-time events should call this rather than
 * creating their own connections.
 *
 * @returns {Echo}
 */
export function getEcho() {
  if (echo) return echo;

  const extra = Constants.expoConfig?.extra ?? {};

  const wsHost   = extra.reverbHost   || 'localhost';
  const wsPort   = extra.reverbPort   || 8080;
  const appKey   = extra.reverbKey    || 'evac-route-key';
  const useTLS   = (extra.reverbScheme || 'http') === 'https';

  // pusher-js is used as the underlying transport for Reverb's Pusher-compatible protocol
  const pusherClient = new Pusher(appKey, {
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS: useTLS,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    cluster: 'mt1', // required by pusher-js but ignored by Reverb
  });

  echo = new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS: useTLS,
    enabledTransports: ['ws', 'wss'],
    client: pusherClient,
  });

  console.log('[Echo] WebSocket connection initialised →', `${useTLS ? 'wss' : 'ws'}://${wsHost}:${wsPort}`);

  return echo;
}

/**
 * Disconnects and destroys the Echo instance.
 * Must be called on user logout to avoid stale subscriptions and memory leaks.
 */
export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
    console.log('[Echo] WebSocket disconnected.');
  }
}
