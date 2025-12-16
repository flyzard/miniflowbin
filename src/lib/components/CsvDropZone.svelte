<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /** Description text shown above the drop zone */
  export let description: string = '';
  /** Accepted file types */
  export let accept: string = '.csv';
  /** Disable the drop zone */
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ file: File }>();

  let fileInput: HTMLInputElement;
  let isDragging = false;

  function handleDragOver(event: DragEvent) {
    if (disabled) return;
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (disabled) return;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      dispatch('file', event.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      dispatch('file', input.files[0]);
    }
  }

  function handleClick() {
    if (!disabled) {
      fileInput.click();
    }
  }

  function handleKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !disabled) {
      fileInput.click();
    }
  }
</script>

{#if description}
  <p class="description">{description}</p>
{/if}

<div
  class="drop-zone"
  class:dragging={isDragging}
  class:disabled
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="button"
  tabindex={disabled ? -1 : 0}
  on:click={handleClick}
  on:keypress={handleKeypress}
>
  <div class="drop-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
      <path d="M14 2v6h6"/>
      <path d="M12 18v-6"/>
      <path d="m9 15 3-3 3 3"/>
    </svg>
  </div>
  <span class="drop-text">Drop CSV file here</span>
  <span class="drop-subtext">or click to browse</span>
</div>

<input
  bind:this={fileInput}
  type="file"
  {accept}
  class="file-input"
  on:change={handleFileSelect}
/>

<style>
  .description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    margin-bottom: var(--space-md);
  }

  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    border: 2px dashed var(--color-border-subtle);
    border-radius: var(--radius-card);
    background: var(--color-bg-input);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
    min-height: 180px;
  }

  .drop-zone:hover:not(.disabled),
  .drop-zone.dragging {
    border-color: var(--color-accent-primary);
    background: rgba(255, 255, 255, 0.02);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .drop-icon {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-md);
  }

  .drop-text {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .drop-subtext {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .file-input {
    display: none;
  }
</style>
