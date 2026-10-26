/**
 * Professional Thermal POS & Receipt Printing Utility
 * Opens an isolated hidden iframe and prints strictly the receipt/ticket content
 * with zero browser margins, zero headers/footers, and zero background UI elements.
 */
export function printReceiptElement(elementId: string, title: string = 'Receipt') {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove any prior print iframes
  const existingIframe = document.getElementById('pos-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Collect Tailwind styles or inline fonts
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((style) => style.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            margin: 0mm;
            size: auto;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            display: flex;
            justify-content: center;
            padding: 8px !important;
          }
          * {
            box-sizing: border-box;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          .thermal-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 auto !important;
            font-family: 'JetBrains Mono', 'Courier New', monospace !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .a4-invoice {
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Wait for images (like the QR code) to load before triggering print
  const images = iframe.contentWindow?.document.querySelectorAll('img') || [];
  let loadedImages = 0;

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  };

  if (images.length === 0) {
    setTimeout(triggerPrint, 150);
  } else {
    images.forEach((img) => {
      if (img.complete) {
        loadedImages++;
        if (loadedImages === images.length) triggerPrint();
      } else {
        img.onload = () => {
          loadedImages++;
          if (loadedImages === images.length) triggerPrint();
        };
        img.onerror = () => {
          loadedImages++;
          if (loadedImages === images.length) triggerPrint();
        };
      }
    });

    // Fallback timeout in case image events don't fire
    setTimeout(() => {
      if (loadedImages < images.length) {
        triggerPrint();
      }
    }, 600);
  }
}
