import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const OFFLINE_SOS_QUEUE_KEY = 'OFFLINE_SOS_QUEUE';
let flushPromise = null;

export async function enqueueOfflineSos(payload) {
  const stored = await AsyncStorage.getItem(OFFLINE_SOS_QUEUE_KEY);
  let queue = [];
  try {
    queue = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[SOS] Discarding malformed offline queue:', error.message);
  }
  queue.push({ id: `sos_${Date.now()}`, payload, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(OFFLINE_SOS_QUEUE_KEY, JSON.stringify(queue));
}

async function flushQueue() {
  const stored = await AsyncStorage.getItem(OFFLINE_SOS_QUEUE_KEY);
  if (!stored) return { sent: 0, remaining: 0 };

  let queue;
  try {
    queue = JSON.parse(stored);
  } catch (error) {
    console.warn('[SOS] Cannot read offline queue:', error.message);
    return { sent: 0, remaining: 0 };
  }

  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    try {
      await api.post('/rescue/sos', item.payload);
      sent += 1;
    } catch (error) {
      remaining.push(item);
      if (!error.response) break;
    }
  }
  await AsyncStorage.setItem(OFFLINE_SOS_QUEUE_KEY, JSON.stringify(remaining));
  return { sent, remaining: remaining.length };
}

export function flushOfflineSosQueue() {
  if (!flushPromise) {
    flushPromise = flushQueue().finally(() => {
      flushPromise = null;
    });
  }
  return flushPromise;
}
