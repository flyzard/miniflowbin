/**
 * Barcode Scanner Service
 *
 * Provides camera-based barcode scanning using html5-qrcode.
 * Works on both web (PWA) and Android (via WebView).
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface ScanResult {
  barcode: string;
  format: string;
}

export interface ScannerConfig {
  fps?: number;
  qrbox?: { width: number; height: number };
  aspectRatio?: number;
}

const DEFAULT_CONFIG: ScannerConfig = {
  fps: 10,
  qrbox: { width: 250, height: 100 },
  aspectRatio: 1.0,
};

// Supported barcode formats for warehouse products
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
];

let scanner: Html5Qrcode | null = null;

/**
 * Check if camera scanning is supported
 */
export async function isCameraScanningSupported(): Promise<boolean> {
  try {
    const devices = await Html5Qrcode.getCameras();
    return devices.length > 0;
  } catch {
    return false;
  }
}

/**
 * Start camera scanner
 * @param elementId - DOM element ID to render scanner in
 * @param onScan - Callback when barcode is scanned
 * @param onError - Callback for scan errors (optional)
 * @param config - Scanner configuration (optional)
 */
export async function startScanner(
  elementId: string,
  onScan: (result: ScanResult) => void,
  onError?: (error: string) => void,
  config: ScannerConfig = DEFAULT_CONFIG
): Promise<void> {
  if (scanner) {
    await stopScanner();
  }

  scanner = new Html5Qrcode(elementId, {
    formatsToSupport: SUPPORTED_FORMATS,
    verbose: false,
  });

  try {
    await scanner.start(
      { facingMode: 'environment' }, // Prefer back camera
      {
        fps: config.fps ?? DEFAULT_CONFIG.fps!,
        qrbox: config.qrbox ?? DEFAULT_CONFIG.qrbox!,
        aspectRatio: config.aspectRatio ?? DEFAULT_CONFIG.aspectRatio!,
      },
      (decodedText, decodedResult) => {
        onScan({
          barcode: decodedText,
          format: decodedResult.result.format?.formatName ?? 'unknown',
        });
      },
      (errorMessage) => {
        // Ignore "No barcode found" messages (normal during scanning)
        if (!errorMessage.includes('No MultiFormat Readers')) {
          onError?.(errorMessage);
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start scanner';
    onError?.(message);
    throw error;
  }
}

/**
 * Stop camera scanner
 */
export async function stopScanner(): Promise<void> {
  if (scanner) {
    try {
      const state = scanner.getState();
      if (state === 2) { // SCANNING state
        await scanner.stop();
      }
    } catch {
      // Ignore errors when stopping
    }
    scanner = null;
  }
}
