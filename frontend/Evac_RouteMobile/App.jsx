import { useEffect } from 'react';
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getEcho, disconnectEcho } from './src/services/echoService';
import { useResidentStore } from './src/context/useResidentStore';
import api from './src/services/api';

// ─── Global notification handler — show alerts even when app is in foreground ───
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

/**
 * Requests push notification permission, retrieves the Expo Push Token,
 * and registers it with the backend so LGU can send server-initiated alerts.
 * Failure is non-fatal — real-time WebSocket delivery (P1) still works independently.
 */
async function registerForPushNotificationsAsync() {
  // Android: create the notification channel first
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 100, 300, 100, 300],
      lightColor: '#EF4444',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission denied — push notifications unavailable.');
    return;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Expo Push Token acquired.');

    // P2: Register token with backend — stored in users.push_token
    await api.post('/user/push-token', { push_token: token });
    console.log('[Push] Token registered with backend successfully.');
  } catch (error) {
    // Non-fatal: real-time WebSocket (P1) still delivers alerts in-app
    console.warn('[Push] Token registration failed:', error.message);
  }
}

function App() {
  useEffect(() => {
    // ── P2: Request permission & register Expo Push Token with backend ──
    registerForPushNotificationsAsync();

    // ── Foreground notification tap listener ──
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Push] Foreground notification received:', notification.request.content.title);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Future: deep-link to AlertHistoryScreen on tap
      console.log('[Push] Notification tapped:', response.notification.request.content.data);
    });

    // ─────────────────────────────────────────────────────────────────────
    // P1: Connect to Laravel Reverb WebSocket server and subscribe to the
    //     public 'map-updates' channel to receive real-time emergency events.
    // ─────────────────────────────────────────────────────────────────────
    const echo = getEcho();

    echo.channel('map-updates')

      // ── Emergency Alert Broadcast (from LGU Alerts panel) ──
      .listen('.emergency.alert', async (event) => {
        console.log('[Echo] Emergency alert received:', event.title);

        // 1. Add to Zustand alert history (AlertHistoryScreen reads from this)
        useResidentStore.getState().addAlert({
          type: event.severity === 'critical' ? 'evacuation' : 'info',
          title: event.title,
          message: event.message,
        });

        // 2. Schedule an immediate local Expo notification
        //    — appears in the phone status bar and wakes the screen
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${event.title}`,
            body: event.message,
            sound: true,
            channelId: 'emergency',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: 'emergency_alert', alertId: event.id },
          },
          trigger: null, // fire immediately
        });
      })

      // ── Hazard Created — invalidate the resident map cache immediately ──
      .listen('.hazard.created', () => {
        console.log('[Echo] New hazard created — refreshing map data.');
        queryClient.invalidateQueries({ queryKey: ['resident-map-data'] });
      })

      // ── Hazard Resolved — remove from map without waiting for poll ──
      .listen('.hazard.resolved', () => {
        console.log('[Echo] Hazard resolved — refreshing map data.');
        queryClient.invalidateQueries({ queryKey: ['resident-map-data'] });
      })

      // ── Road Maintenance Created ──
      .listen('.road.maintenance.created', () => {
        console.log('[Echo] Road maintenance started — refreshing map data.');
        queryClient.invalidateQueries({ queryKey: ['resident-map-data'] });
      })

      // ── Road Maintenance Resolved ──
      .listen('.road.maintenance.resolved', () => {
        console.log('[Echo] Road maintenance resolved — refreshing map data.');
        queryClient.invalidateQueries({ queryKey: ['resident-map-data'] });
      });

    // ─────────────────────────────────────────────────────────────────────
    // Staff-alerts channel: dispatch order notifications for lgu_staff/admin
    // This channel is public so it connects even before we know the role.
    // The mobile app filters relevant events in the UI.
    // ─────────────────────────────────────────────────────────────────────
    echo.channel('staff-alerts')
      .listen('.dispatch.order.created', async (event) => {
        console.log('[Echo] New dispatch order created:', event.shelter_name);

        // Refresh dispatch queue badge count immediately
        queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });

        // Push notification to staff device
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📦 New Dispatch Order',
            body: `Deliver ${event.item_count} item${event.item_count !== 1 ? 's' : ''} to ${event.shelter_name}`,
            sound: true,
            channelId: 'emergency',
            data: { type: 'dispatch_order', orderId: event.id },
          },
          trigger: null,
        });
      });

    // ── Delivery confirmed — refresh web inventory (for web) and queue (for mobile) ──
    echo.channel('map-updates')
      .listen('.dispatch.order.delivered', () => {
        queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
        queryClient.invalidateQueries({ queryKey: ['staff-shelter-overview'] });
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      // P1: Clean up WebSocket connection to avoid stale subscriptions on re-mount
      disconnectEcho();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

registerRootComponent(App);
