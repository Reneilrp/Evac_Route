/**
 * Isolated iframe-based element printer.
 * Eliminates issues with ancestor overflow:hidden, h-screen, visibility:hidden,
 * or modal backdrops blanking out the printed document.
 *
 * @param {HTMLElement} element - The DOM element containing the report to print
 * @param {string} title - The document title (used by browsers as default PDF filename)
 */
export function printElement(element, title = 'Document') {
  if (!element) {
    console.warn('printElement: No element provided to print');
    return;
  }

  // Guard for non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Create an invisible iframe
  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;');
  iframe.setAttribute('title', 'Print Preview Frame');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Graceful fallback to window.print if iframe document inaccessible
    const originalTitle = document.title;
    document.title = title;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
    return;
  }

  doc.open();

  // 2. Extract all styles from host document (including Vite, Tailwind, and custom CSS)
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  // 3. Write complete standalone printable document
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 100%; margin: 0; padding: 0;">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // 4. Focus and trigger print after styles are parsed
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Failed to trigger iframe print, falling back to window.print:', err);
      const originalTitle = document.title;
      document.title = title;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } finally {
      // Clean up iframe after print dialog is closed or dismissed
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 250);
}
