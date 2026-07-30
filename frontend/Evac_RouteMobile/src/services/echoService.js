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

    let EchoClass = typeof Echo === 'function' ? Echo : (Echo?.default || Echo);
    let PusherClass = typeof Pusher === 'function' ? Pusher : (Pusher?.default || Pusher?.Pusher || Pusher);

    if (PusherClass) {
      if (typeof global !== 'undefined') global.Pusher = PusherClass;
      if (typeof window !== 'undefined') window.Pusher = PusherClass;
    }

    if (typeof EchoClass !== 'function') {
      throw new Error(`Echo constructor unavailable (Echo type: ${typeof EchoClass})`);
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

/**
 * SOCKET GUARD: Wraps WebSocket channel listeners with a simulation guard.
 * Automatically drops any test simulation broadcasts (is_simulation: true) on production clients.
 */
export function listenWithSimulationGuard(channelName, eventName, callback) {
  const echo = getEcho();
  if (!echo || !echo.channel) return null;

  return echo.channel(channelName).listen(eventName, (data) => {
    if (data && (data.is_simulation === true || data.is_test === true)) {
      console.log(`[SocketGuard] Dropped simulation event '${eventName}' on resident mobile client.`);
      return; // Hard drop test simulation broadcasts on production mobile devices
    }
    callback(data);
  });
}
