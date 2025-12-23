/**
 * Hardware Barcode Scanner Detection
 *
 * Detects input from hardware barcode scanners (HID keyboard emulation).
 * Hardware scanners type characters rapidly (< 50ms between keystrokes)
 * and typically end with Enter key.
 */

export interface HardwareScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;      // Minimum barcode length (default: 4)
  maxDelay?: number;       // Max ms between keystrokes (default: 50)
  terminator?: string[];   // Keys that terminate scan (default: ['Enter'])
}

export function createHardwareScannerListener(options: HardwareScannerOptions) {
  const {
    onScan,
    minLength = 4,
    maxDelay = 50,
    terminator = ['Enter'],
  } = options;

  let buffer = '';
  let lastKeyTime = 0;

  function handleKeyDown(event: KeyboardEvent) {
    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime;

    // Check if this is a terminator key
    if (terminator.includes(event.key)) {
      if (buffer.length >= minLength) {
        // Valid barcode scanned
        event.preventDefault();
        onScan(buffer.trim());
      }
      buffer = '';
      lastKeyTime = 0;
      return;
    }

    // Reset buffer if too much time has passed (manual typing)
    if (timeSinceLastKey > maxDelay && buffer.length > 0) {
      buffer = '';
    }

    // Only capture printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      // If this is rapid input, accumulate
      if (buffer.length === 0 || timeSinceLastKey <= maxDelay) {
        buffer += event.key;
        lastKeyTime = now;

        // Prevent character from being typed if we're in scanning mode
        if (buffer.length > 1 && timeSinceLastKey <= maxDelay) {
          event.preventDefault();
        }
      }
    }
  }

  function reset() {
    buffer = '';
    lastKeyTime = 0;
  }

  return {
    handleKeyDown,
    reset,
    attach(element: HTMLElement | Window = window) {
      element.addEventListener('keydown', handleKeyDown as EventListener);
    },
    detach(element: HTMLElement | Window = window) {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
      reset();
    },
  };
}
