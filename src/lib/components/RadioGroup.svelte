<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type T = $$Generic;

  export let options: Array<{ value: T; label: string; description?: string }> = [];
  export let value: T;
  export let name: string = 'radio-group';
  export let label: string = '';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ change: T }>();

  function handleChange(newValue: T) {
    if (disabled) return;
    value = newValue;
    dispatch('change', newValue);
  }
</script>

<fieldset class="radio-group" class:disabled>
  {#if label}
    <legend class="legend">{label}</legend>
  {/if}

  <div class="options">
    {#each options as option}
      <label class="option" class:selected={value === option.value}>
        <input
          type="radio"
          {name}
          checked={value === option.value}
          {disabled}
          on:change={() => handleChange(option.value)}
        />
        <span class="radio-indicator">
          {#if value === option.value}
            <span class="radio-dot"></span>
          {/if}
        </span>
        <div class="option-content">
          <span class="option-label">{option.label}</span>
          {#if option.description}
            <span class="option-description">{option.description}</span>
          {/if}
        </div>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .radio-group {
    border: none;
    padding: 0;
    margin: 0;
  }

  .legend {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-sm);
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 2px solid transparent;
    border-radius: var(--radius-input);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  .option:hover {
    border-color: var(--color-border-subtle);
  }

  .option.selected {
    border-color: var(--color-accent-primary);
    background: rgba(255, 255, 255, 0.02);
  }

  .option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .radio-indicator {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border-subtle);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color var(--transition-fast);
  }

  .option.selected .radio-indicator {
    border-color: var(--color-accent-primary);
  }

  .radio-dot {
    width: 10px;
    height: 10px;
    background: var(--color-accent-primary);
    border-radius: 50%;
  }

  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .option-label {
    font-weight: var(--font-weight-semibold);
  }

  .option-description {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .disabled {
    opacity: 0.5;
  }

  .disabled .option {
    cursor: not-allowed;
  }
</style>
