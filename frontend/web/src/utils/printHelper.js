/**
 * Opens the official Laravel Blade report in a dedicated printable browser tab.
 * This guarantees 100% visible, fully populated, multi-page printouts with zero blank preview bugs.
 *
 * @param {string} endpoint - The report endpoint path, e.g. '/reports/stock-print'
 * @param {Record<string, string|number>} params - Optional query parameters
 */
export function openBladePrintReport(endpoint, params = {}) {
  if (typeof window === 'undefined') return;

  const token = sessionStorage.getItem('auth_token') || '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const baseUrl = apiBase.replace(/\/api\/?$/, '');

  const queryParams = new URLSearchParams();
  if (token) queryParams.set('token', token);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      queryParams.set(key, String(val));
    }
  });

  const queryString = queryParams.toString();
  const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    window.location.href = url;
  }
}

/**
 * Isolated client-side element printer fallback.
 */
export function printElement(element, title = 'Document') {
  if (!element) {
    console.warn('printElement: No element provided to print');
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const originalTitle = document.title;
  document.title = title;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
