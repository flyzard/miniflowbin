import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHardwareScannerListener } from '../useHardwareScanner';

describe('useHardwareScanner', () => {
  let onScan: (barcode: string) => void;
  let scanner: ReturnType<typeof createHardwareScannerListener>;

  beforeEach(() => {
    vi.useFakeTimers();
    onScan = vi.fn();
    scanner = createHardwareScannerListener({ onScan });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createKeyEvent(key: string, preventDefault = vi.fn()): KeyboardEvent {
    return {
      key,
      preventDefault,
      ctrlKey: false,
      metaKey: false,
    } as unknown as KeyboardEvent;
  }

  function simulateRapidTyping(chars: string, delayMs = 10) {
    chars.split('').forEach((char) => {
      scanner.handleKeyDown(createKeyEvent(char));
      vi.advanceTimersByTime(delayMs);
    });
  }

  it('should detect rapid input as scanner and trigger callback on Enter', () => {
    simulateRapidTyping('1234567890123');
    scanner.handleKeyDown(createKeyEvent('Enter'));

    expect(onScan).toHaveBeenCalledWith('1234567890123');
  });

  it('should not trigger for short input (less than minLength)', () => {
    simulateRapidTyping('123');
    scanner.handleKeyDown(createKeyEvent('Enter'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should reset buffer when typing is slow (manual typing)', () => {
    // Type first part rapidly
    simulateRapidTyping('123');

    // Wait longer than maxDelay (50ms default)
    vi.advanceTimersByTime(100);

    // Type more - should start fresh buffer
    simulateRapidTyping('456');
    scanner.handleKeyDown(createKeyEvent('Enter'));

    // Should not trigger because the buffer was reset
    expect(onScan).not.toHaveBeenCalled();
  });

  it('should handle exact minLength input', () => {
    const customScanner = createHardwareScannerListener({
      onScan,
      minLength: 4,
    });

    // Type exactly 4 chars
    '1234'.split('').forEach((char) => {
      customScanner.handleKeyDown(createKeyEvent(char));
      vi.advanceTimersByTime(10);
    });
    customScanner.handleKeyDown(createKeyEvent('Enter'));

    expect(onScan).toHaveBeenCalledWith('1234');
  });

  it('should ignore control keys (Ctrl, Meta)', () => {
    const ctrlEvent = {
      key: 'c',
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    scanner.handleKeyDown(ctrlEvent);
    simulateRapidTyping('12345');
    scanner.handleKeyDown(createKeyEvent('Enter'));

    // Should only have the 5 chars, not the ctrl+c
    expect(onScan).toHaveBeenCalledWith('12345');
  });

  it('should support custom terminator keys', () => {
    const customScanner = createHardwareScannerListener({
      onScan,
      terminator: ['Tab'],
    });

    '12345'.split('').forEach((char) => {
      customScanner.handleKeyDown(createKeyEvent(char));
      vi.advanceTimersByTime(10);
    });
    customScanner.handleKeyDown(createKeyEvent('Tab'));

    expect(onScan).toHaveBeenCalledWith('12345');
  });

  it('should preventDefault on Enter when valid barcode is detected', () => {
    const preventDefault = vi.fn();
    simulateRapidTyping('1234567890123');
    scanner.handleKeyDown(createKeyEvent('Enter', preventDefault));

    expect(preventDefault).toHaveBeenCalled();
  });

  it('should reset buffer after calling reset()', () => {
    simulateRapidTyping('12345');
    scanner.reset();
    scanner.handleKeyDown(createKeyEvent('Enter'));

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should attach and detach event listeners', () => {
    const mockElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    scanner.attach(mockElement as unknown as HTMLElement);
    expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

    scanner.detach(mockElement as unknown as HTMLElement);
    expect(mockElement.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
