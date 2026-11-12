import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../config/version';
import { PATCH_NOTES_HISTORY } from '../config/patchNotes';

const LAST_SEEN_VERSION_KEY = 'evacroute_last_seen_patch_version';

const AppUpdateContext = createContext(null);

export function AppUpdateProvider({ children, navigationRef = null }) {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateManifest, setUpdateManifest] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNewPatchBanner, setShowNewPatchBanner] = useState(false);
  const [activePatchNotes, setActivePatchNotes] = useState(PATCH_NOTES_HISTORY[0]);

  // Check if a new version patch was applied or never seen before
  useEffect(() => {
    (async () => {
      try {
        const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
        if (!lastSeen || lastSeen !== APP_VERSION) {
          // Show subtle in-app patch banner to invite user to view release notes
          setShowNewPatchBanner(true);
        }
      } catch (_e) {
        // Safe ignore
      }
    })();
  }, []);

  const markPatchNotesAsSeen = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
      setShowNewPatchBanner(false);
    } catch (_e) {
      // Safe ignore
    }
  }, []);

  // Check for EAS OTA updates silently or on manual request
  const checkForAppUpdate = useCallback(async (isManual = false) => {
    if (__DEV__) {
      if (isManual) {
        Alert.alert(
          'Dev Environment',
          `Running on Expo Dev Server. EAS Over-The-Air updates are active in standalone production builds. Current version: v${APP_VERSION}.`
        );
      }
      return { isAvailable: false };
    }

    if (!Updates.isEnabled) {
      if (isManual) {
        Alert.alert(
          'Updates Disabled',
          `EAS Updates are currently not enabled in this runtime. Current version: v${APP_VERSION}.`
        );
      }
      return { isAvailable: false };
    }

    setIsChecking(true);
    try {
      const checkResult = await Updates.checkForUpdateAsync();
      if (checkResult.isAvailable) {
        setUpdateAvailable(true);
        setUpdateManifest(checkResult.manifest || null);
        setShowUpdateModal(true);
        return { isAvailable: true, manifest: checkResult.manifest };
      } else {
        setUpdateAvailable(false);
        if (isManual) {
          Alert.alert(
            'App Up to Date',
            `EvacRoute is running the latest available version (v${APP_VERSION}).`
          );
        }
        return { isAvailable: false };
      }
    } catch (error) {
      if (isManual) {
        Alert.alert(
          'Update Check Failed',
          error?.message || 'Could not reach update server. Please check your internet connection.'
        );
      }
      return { isAvailable: false, error };
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Download and apply the update immediately
  const applyUpdateNow = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) {
      setShowUpdateModal(false);
      return;
    }

    setIsDownloading(true);
    try {
      const fetchResult = await Updates.fetchUpdateAsync();
      if (fetchResult.isNew) {
        // Mark patch notes as ready
        await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
        // Reload JS runtime with the new bundle
        await Updates.reloadAsync();
      } else {
        setShowUpdateModal(false);
        Alert.alert('Update Staged', 'The update will apply automatically on next launch.');
      }
    } catch (error) {
      Alert.alert(
        'Download Failed',
        error?.message || 'Could not download the update. Please try again later.'
      );
    } finally {
      setIsDownloading(false);
      setShowUpdateModal(false);
    }
  }, []);

  // Auto-check once on app launch
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForAppUpdate(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [checkForAppUpdate]);

  return (
    <AppUpdateContext.Provider
      value={{
        currentVersion: APP_VERSION,
        isChecking,
        isDownloading,
        updateAvailable,
        updateManifest,
        showUpdateModal,
        setShowUpdateModal,
        showNewPatchBanner,
        setShowNewPatchBanner,
        markPatchNotesAsSeen,
        checkForAppUpdate,
        applyUpdateNow,
        activePatchNotes,
        patchHistory: PATCH_NOTES_HISTORY,
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  );
}

export function useAppUpdate() {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within an AppUpdateProvider');
  }
  return context;
}
