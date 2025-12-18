<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value: number = 1;
  export let min: number = 1;
  export let max: number = 999999;
  export let step: number = 1;
  export let disabled: boolean = false;
  export let label: string = '';
  export let required: boolean = false;

  const dispatch = createEventDispatcher<{ change: number }>();

  // Generate unique ID for accessibility
  const id = `qty-${Math.random().toString(36).slice(2, 9)}`;

  function increment() {
    if (disabled || value >= max) return;
    value = Math.min(value + step, max);
    dispatch('change', value);
  }

  function decrement() {
    if (disabled || value <= min) return;
    value = Math.max(value - step, min);
    dispatch('change', value);
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    let newValue = parseInt(target.value) || min;
    newValue = Math.max(min, Math.min(max, newValue));
    value = newValue;
    dispatch('change', value);
  }

  function handleBlur() {
    // Ensure value is valid on blur
    if (value < min) value = min;
    if (value > max) value = max;
  }
</script>

<div class="quantity-input" class:disabled>
  {#if label}
    <label class="label" for={id}>{label}{required ? ' *' : ''}</label>
  {/if}

  <div class="input-wrapper">
    <button
      type="button"
      class="btn-decrement"
      on:click={decrement}
      disabled={disabled || value <= min}
      aria-label="Decrease quantity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <input
      type="number"
      {id}
      class="input"
      {min}
      {max}
      {step}
      {disabled}
      bind:value
      on:input={handleInput}
      on:blur={handleBlur}
    />

    <button
      type="button"
      class="btn-increment"
      on:click={increment}
      disabled={disabled || value >= max}
      aria-label="Increase quantity"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .quantity-input {
    width: 100%;
  }

  .label {
    display: block;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .input-wrapper {
    display: flex;
    align-items: stretch;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    overflow: hidden;
  }

  .input {
    flex: 1;
    min-width: 0;
    padding: var(--space-md);
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    background: transparent;
    -moz-appearance: textfield;
  }

  .input::-webkit-outer-spin-button,
  .input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .btn-decrement,
  .btn-increment {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    color: var(--color-text-primary);
    transition: background var(--transition-fast);
  }

  .btn-decrement {
    border-right: 1px solid var(--color-border-subtle);
  }

  .btn-increment {
    border-left: 1px solid var(--color-border-subtle);
  }

  .btn-decrement:not(:disabled):hover,
  .btn-increment:not(:disabled):hover {
    background: var(--color-bg-card);
  }

  .btn-decrement:disabled,
  .btn-increment:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .disabled {
    opacity: 0.5;
  }

  .disabled .input,
  .disabled .btn-decrement,
  .disabled .btn-increment {
    cursor: not-allowed;
  }
</style>
