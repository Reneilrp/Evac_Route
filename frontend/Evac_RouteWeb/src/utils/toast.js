import toast from 'react-hot-toast';

/**
 * Evac_Route Premium Toast Utility
 * Centralized notification system for the Web platform.
 */

const toastConfig = {
  duration: 4000,
  position: 'top-center',
};

export const showSuccess = (message, options = {}) => {
  const toastOptions = typeof options === 'string' ? { id: options } : options;
  return toast.success(message, {
    ...toastConfig,
    id: message,
    ...toastOptions,
  });
};

export const showError = (message, options = {}) => {
  const toastOptions = typeof options === 'string' ? { id: options } : options;
  return toast.error(message, {
    ...toastConfig,
    duration: 6000,
    id: message,
    ...toastOptions,
  });
};

export const showWarning = (message, options = {}) => {
  const toastOptions = typeof options === 'string' ? { id: options } : options;
  return toast(message, {
    ...toastConfig,
    icon: '⚠️',
    style: {
      ...toastConfig.style,
      border: '1px solid #F59E0B',
    },
    id: message,
    ...toastOptions,
  });
};

export const showInfo = (message, options = {}) => {
  const toastOptions = typeof options === 'string' ? { id: options } : options;
  return toast(message, {
    ...toastConfig,
    icon: 'ℹ️',
    id: message,
    ...toastOptions,
  });
};

export const showLoading = (message) => {
  return toast.loading(message, {
    ...toastConfig,
    id: 'global-loading',
  });
};

export const dismissToast = (id) => {
  toast.dismiss(id);
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  dismiss: dismissToast,
};
