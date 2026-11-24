import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const OFFLINE_CHECKIN_QUEUE_KEY = 'OFFLINE_CHECKIN_QUEUE';
let flushPromise = null;

/**
 * Enqueue a resident check-in locally when internet connectivity is unavailable.
 */
export async function enqueueOfflineCheckin(payload) {
  const stored = await AsyncStorage.getItem(OFFLINE_CHECKIN_QUEUE_KEY);
  let queue = [];
  try {
    queue = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[CheckInQueue] Discarding malformed offline queue:', error.message);
  }

  const checkinItem = {
    id: `checkin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    payload,
    queuedAt: new Date().toISOString(),
  };

  queue.push(checkinItem);
  await AsyncStorage.setItem(OFFLINE_CHECKIN_QUEUE_KEY, JSON.stringify(queue));
  return checkinItem;
}

/**
 * Get all pending offline check-in records.
 */
export async function getOfflineCheckinQueue() {
  const stored = await AsyncStorage.getItem(OFFLINE_CHECKIN_QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (_e) {
    return [];
  }
}

/**
 * Get the count of pending offline check-in records.
 */
export async function getOfflineCheckinCount() {
  const queue = await getOfflineCheckinQueue();
  return queue.length;
}

/**
 * Flush and synchronize queued offline check-ins with the central server.
 */
async function flushQueue() {
  const stored = await AsyncStorage.getItem(OFFLINE_CHECKIN_QUEUE_KEY);
  if (!stored) return { synced: 0, remaining: 0 };

  let queue;
  try {
    queue = JSON.parse(stored);
  } catch (error) {
    console.warn('[CheckInQueue] Cannot read offline queue:', error.message);
    return { synced: 0, remaining: 0 };
  }

  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const shelterId = item.payload.shelter_id || item.payload.target_shelter_id;
      if (!shelterId) {
        console.warn('[CheckInQueue] Skipping checkin without shelter_id:', item);
        continue;
      }
      await api.post(`/shelters/${shelterId}/check-in`, item.payload);
      synced += 1;
    } catch (error) {
      // If server rejected with 422 or family already checked in, don't keep blocking queue
      if (error.response?.status === 422 || error.response?.data?.message?.includes('already checked in')) {
        console.info('[CheckInQueue] Checkin already resolved on server:', item.id);
        synced += 1;
      } else {
        remaining.push(item);
        // If it's a network disconnect, stop flushing the rest of the queue
        if (!error.response) break;
      }
    }
  }

  await AsyncStorage.setItem(OFFLINE_CHECKIN_QUEUE_KEY, JSON.stringify(remaining));
  return { synced, remaining: remaining.length };
}

export function flushOfflineCheckinQueue() {
  if (!flushPromise) {
    flushPromise = flushQueue().finally(() => {
      flushPromise = null;
    });
  }
  return flushPromise;
}

export async function clearOfflineCheckinQueue() {
  await AsyncStorage.removeItem(OFFLINE_CHECKIN_QUEUE_KEY);
}
