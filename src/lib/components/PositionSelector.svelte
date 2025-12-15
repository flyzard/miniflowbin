<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { StoragePosition } from '../types';

  export let label: string = 'Storage Position';
  export let positions: StoragePosition[] = [];
  export let value: StoragePosition | null = null;
  export let required: boolean = false;

  const dispatch = createEventDispatcher<{ select: StoragePosition | null }>();

  // Internal state for drill-down
  let selectedZone: string | null = null;
  let selectedShelf: string | null = null;

  // Parse code into segments: "A-01-1" → { zone: "A", shelf: "01", slot: "1" }
  function parseCode(code: string): { zone: string; shelf: string; slot: string } {
    const parts = code.split('-');
    return {
      zone: parts[0] || '',
      shelf: parts[1] || '',
      slot: parts[2] || ''
    };
  }

  // Derived data (reactive)
  $: zones = [...new Set(positions.map(p => parseCode(p.code).zone))].sort();

  $: shelves = selectedZone
    ? [...new Set(
        positions
          .filter(p => parseCode(p.code).zone === selectedZone)
          .map(p => parseCode(p.code).shelf)
      )].sort()
    : [];

  $: availablePositions = selectedZone && selectedShelf
    ? positions.filter(p => {
        const parsed = parseCode(p.code);
        return parsed.zone === selectedZone && parsed.shelf === selectedShelf;
      })
    : [];

  $: slots = availablePositions
    .map(p => ({
      slot: parseCode(p.code).slot,
      position: p
    }))
    .sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));

  // Determine current level
  $: currentLevel = value ? 'selected' : selectedShelf ? 'slot' : selectedZone ? 'shelf' : 'zone';

  // Navigation handlers
  function selectZone(zone: string) {
    selectedZone = zone;
    selectedShelf = null;
  }

  function selectShelf(shelf: string) {
    selectedShelf = shelf;
  }

  function selectSlot(position: StoragePosition) {
    value = position;
    dispatch('select', position);
  }

  function goBack() {
    if (selectedShelf) {
      selectedShelf = null;
    } else if (selectedZone) {
      selectedZone = null;
    }
  }

  function clearSelection() {
    value = null;
    selectedZone = null;
    selectedShelf = null;
    dispatch('select', null);
  }

  // Build breadcrumb text
  $: breadcrumb = (() => {
    if (selectedShelf) return `Zone ${selectedZone} > Shelf ${selectedShelf}`;
    if (selectedZone) return `Zone ${selectedZone}`;
    return '';
  })();

  // Initialize drill-down from existing value
  $: if (value && !selectedZone) {
    const parsed = parseCode(value.code);
    selectedZone = parsed.zone;
    selectedShelf = parsed.shelf;
  }
</script>

<fieldset class="position-selector">
  <legend class="label">
    {label}
    {#if required}
      <span class="required">*</span>
    {/if}
  </legend>

  {#if value}
    <!-- Selected state -->
    <div class="selected-position">
      <div class="selected-info">
        <span class="selected-code">{value.code}</span>
        <span class="selected-zone">Zone {parseCode(value.code).zone}</span>
      </div>
      <button type="button" class="change-btn" on:click={clearSelection}>
        Change
      </button>
    </div>
  {:else if currentLevel === 'zone'}
    <!-- Zone selection -->
    <div class="level-header">
      <span class="level-title">Select Zone</span>
    </div>
    {#if zones.length === 0}
      <p class="empty-message">No positions available</p>
    {:else}
      <div class="button-grid">
        {#each zones as zone}
          <button
            type="button"
            class="selector-button"
            on:click={() => selectZone(zone)}
          >
            {zone}
          </button>
        {/each}
      </div>
    {/if}
  {:else if currentLevel === 'shelf'}
    <!-- Shelf selection -->
    <button type="button" class="back-btn" on:click={goBack}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back
    </button>
    <div class="level-header">
      <span class="breadcrumb">{breadcrumb}</span>
      <span class="level-title">Select Shelf</span>
    </div>
    {#if shelves.length === 0}
      <p class="empty-message">No shelves available in this zone</p>
    {:else}
      <div class="button-grid">
        {#each shelves as shelf}
          <button
            type="button"
            class="selector-button"
            on:click={() => selectShelf(shelf)}
          >
            {shelf}
          </button>
        {/each}
      </div>
    {/if}
  {:else if currentLevel === 'slot'}
    <!-- Slot selection -->
    <button type="button" class="back-btn" on:click={goBack}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back
    </button>
    <div class="level-header">
      <span class="breadcrumb">{breadcrumb}</span>
      <span class="level-title">Select Slot</span>
    </div>
    {#if slots.length === 0}
      <p class="empty-message">No slots available on this shelf</p>
    {:else}
      <div class="button-grid">
        {#each slots as { slot, position }}
          <button
            type="button"
            class="selector-button"
            on:click={() => selectSlot(position)}
          >
            {slot}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</fieldset>

<style>
  .position-selector {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    border: none;
    padding: 0;
    margin: 0;
  }

  .label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .required {
    color: var(--color-accent-error);
  }

  .level-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
  }

  .breadcrumb {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
  }

  .level-title {
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) 0;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    cursor: pointer;
    transition: color var(--transition-fast);
    align-self: flex-start;
  }

  .back-btn:hover {
    color: var(--color-text-primary);
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: var(--space-sm);
  }

  .selector-button {
    min-height: var(--touch-target-min);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-input);
    border: 2px solid transparent;
    border-radius: var(--radius-input);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: border-color var(--transition-fast), transform var(--transition-fast);
  }

  .selector-button:hover {
    border-color: var(--color-border-subtle);
  }

  .selector-button:active {
    transform: scale(0.98);
  }

  .selected-position {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 2px solid var(--color-accent-success);
    border-radius: var(--radius-input);
  }

  .selected-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .selected-code {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .selected-zone {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .change-btn {
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-button);
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    cursor: pointer;
    transition: border-color var(--transition-fast), color var(--transition-fast);
  }

  .change-btn:hover {
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
  }

  .empty-message {
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
    text-align: center;
    padding: var(--space-lg);
  }
</style>
