import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import Constants from 'expo-constants';

let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;

  try {
    const extra = Constants.expoConfig?.extra ?? {};

    const wsHost   = extra.reverbHost   || 'localhost';
    const wsPort   = extra.reverbPort   || 8080;
    const appKey   = extra.reverbKey    || 'evac-route-key';
    const useTLS   = (extra.reverbScheme || 'http') === 'https';

    const EchoClass = typeof Echo === 'function' ? Echo : (Echo?.default || Echo);
    const PusherClass = typeof Pusher === 'function' ? Pusher : (Pusher?.default || Pusher);

    if (typeof EchoClass !== 'function' || typeof PusherClass !== 'function') {
      throw new Error(`Echo or Pusher constructor unavailable (Echo: ${typeof EchoClass}, Pusher: ${typeof PusherClass})`);
    }

    const pusherClient = new PusherClass(appKey, {
      wsHost,
      wsPort,
      wssPort: wsPort,
      forceTLS: useTLS,
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      cluster: 'mt1',
    });

    echoInstance = new EchoClass({
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
    return echoInstance;
  } catch (e) {
    console.warn('[Echo] Failed to initialize Echo WebSocket client:', e?.message || e);
    
    // Fluent dummy fallback so real-time listeners don't throw errors
    const dummyChannel = {
      listen: () => dummyChannel,
    };
    return {
      channel: () => dummyChannel,
      disconnect: () => {},
    };
  }
}

export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (_) {}
    echoInstance = null;
    console.log('[Echo] WebSocket disconnected.');
  }
}
