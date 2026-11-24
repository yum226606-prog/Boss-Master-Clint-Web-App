/**
 * Zero-dependency Pure TypeScript PDF & Share Helper for Boss Aluminium & Glass.
 * Converts high-resolution HTML5 Canvas renders into valid A4 %PDF-1.4 files,
 * triggers native Capacitor Share / Web Share API with pre-built File objects,
 * opens WhatsApp directly without unwanted device downloads when file-share is unavailable,
 * handles Blob downloads safely for explicit Download actions, and prints cleanly via hidden iframe.
 */
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const asciiToBytes = (str: string): Uint8Array => {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
};

const dataUrlToJpegBytes = (dataUrl: string): Uint8Array => {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to encode file'));
    reader.readAsDataURL(blob);
  });

export interface PdfPageImage {
  jpegBytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

/**
 * Pure byte-level PDF builder for one or more JPEG page images mapped onto A4 (595.28 x 841.89 pt).
 */
export const buildPdfFromJpegPages = (pages: PdfPageImage[]): Blob => {
  const pageWidthPt = 595.28;
  const pageHeightPt = 841.89;

  const pageObjIds: number[] = [];
  const objects: { id: number; chunks: Uint8Array[] }[] = [];

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const pageId = 3 + i * 3;
    const contentId = 4 + i * 3;
    const imgId = 5 + i * 3;
    pageObjIds.push(pageId);

    const drawW = pageWidthPt;
    const drawH = Math.min(pageHeightPt, (p.heightPx / p.widthPx) * pageWidthPt);
    const drawY = pageHeightPt - drawH;

    const contentStream = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} 0 ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    const contentBytes = asciiToBytes(contentStream);

    objects.push({
      id: pageId,
      chunks: [
        asciiToBytes(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(
            2
          )}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`
        ),
      ],
    });

    objects.push({
      id: contentId,
      chunks: [
        asciiToBytes(`<< /Length ${contentBytes.length} >>\nstream\n`),
        contentBytes,
        asciiToBytes(`\nendstream`),
      ],
    });

    objects.push({
      id: imgId,
      chunks: [
        asciiToBytes(
          `<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`
        ),
        p.jpegBytes,
        asciiToBytes(`\nendstream`),
      ],
    });
  }

  const catalogObj = {
    id: 1,
    chunks: [asciiToBytes(`<< /Type /Catalog /Pages 2 0 R >>`)],
  };
  const pagesObj = {
    id: 2,
    chunks: [
      asciiToBytes(
        `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
          pageObjIds.length
        } >>`
      ),
    ],
  };

  const allObjects = [catalogObj, pagesObj, ...objects].sort((a, b) => a.id - b.id);
  const parts: Uint8Array[] = [];
  let offset = 0;

  const pushBytes = (arr: Uint8Array) => {
    parts.push(arr);
    offset += arr.length;
  };

  pushBytes(asciiToBytes('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'));

  const offsets: number[] = [0];
  for (const obj of allObjects) {
    offsets[obj.id] = offset;
    pushBytes(asciiToBytes(`${obj.id} 0 obj\n`));
    for (const c of obj.chunks) {
      pushBytes(c);
    }
    pushBytes(asciiToBytes('\nendobj\n'));
  }

  const xrefOffset = offset;
  const totalObjs = allObjects.length + 1;
  let xrefStr = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let id = 1; id < totalObjs; id++) {
    xrefStr += `${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pushBytes(asciiToBytes(xrefStr));

  const blobParts: BlobPart[] = parts.map((chunk) => {
    const copy = new Uint8Array(chunk.length);
    copy.set(chunk);
    return copy.buffer;
  });

  return new Blob(blobParts, { type: 'application/pdf' });
};

/**
 * Slices a rendered HTMLCanvasElement cleanly into A4 page segments and produces a real %PDF-1.4 Blob.
 */
export const canvasToPdfBlob = (sourceCanvas: HTMLCanvasElement, bgFill = '#0D1118'): Blob => {
  const pageWidthPx = sourceCanvas.width;
  const maxPageHeightPx = Math.max(900, Math.floor(pageWidthPx * (841.89 / 595.28)));
  const totalHeight = sourceCanvas.height;
  const pageCount = Math.max(1, Math.ceil(totalHeight / maxPageHeightPx));

  const pages: PdfPageImage[] = [];

  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    const sy = pageIdx * maxPageHeightPx;
    const sliceH = Math.min(maxPageHeightPx, totalHeight - sy);
    const outHeightPx = pageCount === 1 ? Math.max(sliceH, maxPageHeightPx) : maxPageHeightPx;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = pageWidthPx;
    pageCanvas.height = outHeightPx;
    const pCtx = pageCanvas.getContext('2d');
    if (!pCtx) continue;

    pCtx.fillStyle = bgFill;
    pCtx.fillRect(0, 0, pageWidthPx, outHeightPx);
    pCtx.drawImage(sourceCanvas, 0, sy, pageWidthPx, sliceH, 0, 0, pageWidthPx, sliceH);

    const jpegDataUrl = pageCanvas.toDataURL('image/jpeg', 0.92);
    pages.push({
      jpegBytes: dataUrlToJpegBytes(jpegDataUrl),
      widthPx: pageWidthPx,
      heightPx: outHeightPx,
    });
  }

  return buildPdfFromJpegPages(pages);
};

export const downloadBlobFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 20000);
};

export const openExternalShareUrl = (url: string): void => {
  if (!url || typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const shareOrDownloadFile = async ({
  file,
  title,
  text,
  alsoDownloadOnFallback = false,
  openWhatsAppFallback,
}: {
  file: File;
  title: string;
  text: string;
  alsoDownloadOnFallback?: boolean;
  openWhatsAppFallback?: string;
}): Promise<'shared' | 'whatsapp' | 'downloaded' | 'cancelled'> => {
  // 1. Native Android / iOS Capacitor Share Sheet (shows WhatsApp & all installed apps)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const written = await Filesystem.writeFile({
        path: safeName,
        data: base64Data,
        directory: Directory.Cache,
      });
      await Share.share({
        title,
        text,
        files: [written.uri],
        dialogTitle: 'Share via WhatsApp or App',
      });
      return 'shared';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('abort')) {
        return 'cancelled';
      }
      // Try Capacitor Share without files array (url / text fallback) before leaving native flow
      try {
        await Share.share({
          title,
          text,
          dialogTitle: 'Share via WhatsApp or App',
        });
        return 'shared';
      } catch (err2: unknown) {
        const msg2 = err2 instanceof Error ? err2.message.toLowerCase() : String(err2 || '').toLowerCase();
        if (msg2.includes('cancel') || msg2.includes('abort')) {
          return 'cancelled';
        }
      }
    }
  }

  // 2. Web Share API with files (Android Chrome, iOS Safari, modern PWAs -> opens bottom app chooser sheet)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles =
      typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({ title, text, files: [file] });
        return 'shared';
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }

    // If file sharing wasn't accepted by browser/WebView, still open OS share sheet with text/summary
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  // 3. Direct WhatsApp Launch Fallback (NEVER save file when user specifically tapped Share!)
  if (openWhatsAppFallback) {
    openExternalShareUrl(openWhatsAppFallback);
    return 'whatsapp';
  }

  // 4. Explicit download fallback (only when alsoDownloadOnFallback is true)
  if (alsoDownloadOnFallback) {
    downloadBlobFile(file, file.name);
    return 'downloaded';
  }

  return 'cancelled';
};

/**
 * Triggers a clean A4 print dialog via a temporary hidden iframe containing the exact rendered image.
 * Returns true if the browser actually opened the print dialog (`beforeprint` fired), false otherwise.
 */
export const triggerIframePrint = (imageDataUrl: string, title: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined' || !imageDataUrl) {
      resolve(false);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');

    let settled = false;
    const cleanup = (didPrint: boolean) => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2500);
      resolve(didPrint);
    };

    const safeTitle = String(title || 'Boss Aluminium & Glass')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup(false);
        return;
      }
      let beforePrintFired = false;
      const onBeforePrint = () => {
        beforePrintFired = true;
      };
      try {
        win.addEventListener('beforeprint', onBeforePrint, { once: true });
        win.focus();
        win.print();
      } catch {
        cleanup(false);
        return;
      }
      setTimeout(() => {
        cleanup(beforePrintFired);
      }, 350);
    };

    iframe.srcdoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { width: 100%; max-width: 210mm; height: auto; display: block; margin: 0 auto; }
</style>
</head>
<body>
  <img src="${imageDataUrl}" alt="${safeTitle}" />
</body>
</html>`;

    document.body.appendChild(iframe);
    setTimeout(() => cleanup(false), 3000);
  });
