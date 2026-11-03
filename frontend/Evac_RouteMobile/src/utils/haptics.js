import { Vibration } from 'react-native';
import { useResidentStore } from '../context/useResidentStore';

/**
 * Triggers tactile vibration for casual UI taps ONLY IF enabled by the user in settings.
 * Defaults to OFF so casual clicks do not fire the mechanical phone vibrator.
 *
 * @param {number|number[]} duration Duration in ms or pattern
 */
export const triggerCasualHaptic = (duration = 30) => {
  try {
    const isEnabled = useResidentStore.getState().hapticFeedbackEnabled;
    if (isEnabled) {
      Vibration.vibrate(duration);
    }
  } catch (_e) {
    // Graceful no-op in headless/test environments
  }
};

/**
 * Triggers emergency or critical life-safety vibration (always active regardless of user setting).
 *
 * @param {number|number[]} pattern Pattern or duration
 */
export const triggerEmergencyHaptic = (pattern = [0, 500, 200, 500]) => {
  try {
    Vibration.vibrate(pattern);
  } catch (_e) {
    // Graceful no-op in headless/test environments
  }
};
