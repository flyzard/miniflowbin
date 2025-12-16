<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** Number of PIN digits (default 4) */
  export let length: number = 4;
  /** Error message to display */
  export let error: string = '';
  /** Whether input is disabled */
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ complete: string; change: string }>();

  let pin: string = '';
  let dots: boolean[] = Array(length).fill(false);

  function handleKeyPress(digit: string) {
    if (disabled || pin.length >= length) return;

    pin += digit;
    dots[pin.length - 1] = true;
    dots = dots;

    dispatch('change', pin);

    if (pin.length === length) {
      dispatch('complete', pin);
    }
  }

  function handleBackspace() {
    if (disabled || pin.length === 0) return;

    dots[pin.length - 1] = false;
    dots = dots;
    pin = pin.slice(0, -1);

    dispatch('change', pin);
  }

  /** Clear the PIN input (call from parent) */
  export function clear() {
    pin = '';
    dots = Array(length).fill(false);
  }

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'back']
  ];
</script>

<div class="pin-input" class:disabled>
  <!-- PIN dots display -->
  <div class="pin-dots">
    {#each dots as filled}
      <div class="dot" class:filled></div>
    {/each}
  </div>

  <!-- Error message -->
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <!-- Keypad -->
  <div class="keypad">
    {#each keypad as row}
      <div class="row">
        {#each row as key}
          {#if key === ''}
            <div class="key empty"></div>
          {:else if key === 'back'}
            <button
              type="button"
              class="key backspace"
              on:click={handleBackspace}
              {disabled}
              aria-label="Backspace"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                <path d="M18 9l-6 6M12 9l6 6"/>
              </svg>
            </button>
          {:else}
            <button
              type="button"
              class="key"
              on:click={() => handleKeyPress(key)}
              {disabled}
            >
              {key}
            </button>
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .pin-input {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .pin-input.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .pin-dots {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-lg) 0;
  }

  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-border-subtle);
    background: transparent;
    transition: all var(--transition-fast);
  }

  .dot.filled {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
  }

  .error {
    color: var(--color-accent-error);
    font-size: var(--font-size-secondary);
    text-align: center;
    padding: var(--space-sm) var(--space-md);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-button);
    width: 100%;
  }

  .keypad {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
  }

  .row {
    display: flex;
    justify-content: center;
    gap: var(--space-sm);
  }

  .key {
    width: 80px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-button);
    cursor: pointer;
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .key:active:not(:disabled) {
    background: var(--color-border-subtle);
    transform: scale(0.95);
  }

  .key.empty {
    background: transparent;
    border: none;
    cursor: default;
  }

  .key.backspace {
    background: transparent;
    border: none;
  }

  .key.backspace svg {
    width: 28px;
    height: 28px;
  }

  .key:disabled {
    cursor: not-allowed;
  }
</style>
