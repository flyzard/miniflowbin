<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type T = $$Generic;

  export let items: T[] = [];
  export let value: T | null = null;
  export let placeholder: string = 'Select...';
  export let searchPlaceholder: string = 'Search...';
  export let displayFn: (item: T) => string = (item) => String(item);
  export let secondaryFn: ((item: T) => string) | null = null;
  export let filterFn: ((item: T, query: string) => boolean) | null = null;
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let label: string = '';

  const dispatch = createEventDispatcher<{ select: T | null; search: string }>();

  let isOpen = false;
  let searchQuery = '';
  let inputElement: HTMLInputElement;

  // Generate unique ID for accessibility
  const id = `dropdown-${Math.random().toString(36).slice(2, 9)}`;

  $: filteredItems = searchQuery.trim()
    ? items.filter(item => {
        if (filterFn) return filterFn(item, searchQuery);
        const display = displayFn(item).toLowerCase();
        const secondary = secondaryFn ? secondaryFn(item).toLowerCase() : '';
        const query = searchQuery.toLowerCase();
        return display.includes(query) || secondary.includes(query);
      })
    : items;

  function open() {
    if (disabled) return;
    isOpen = true;
    searchQuery = '';
    // Focus input after DOM update
    setTimeout(() => inputElement?.focus(), 10);
  }

  function close() {
    isOpen = false;
    searchQuery = '';
  }

  function select(item: T) {
    value = item;
    dispatch('select', item);
    close();
  }

  function clear() {
    value = null;
    dispatch('select', null);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }

  function handleBackdropClick() {
    close();
  }

  function highlightMatch(text: string, query: string): string {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
</script>

<div class="search-dropdown" class:disabled class:open={isOpen}>
  {#if label}
    <label class="label" for={id}>{label}{required ? ' *' : ''}</label>
  {/if}

  <button
    type="button"
    {id}
    class="trigger"
    class:has-value={value !== null}
    {disabled}
    on:click={open}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    {#if value !== null}
      <span class="selected-value">{displayFn(value)}</span>
      {#if !disabled}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span
          role="button"
          tabindex="-1"
          class="clear-btn"
          on:click|stopPropagation={clear}
          aria-label="Clear selection"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
      {/if}
    {:else}
      <span class="placeholder">{placeholder}</span>
    {/if}
    <svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  </button>

  {#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="backdrop" on:click={handleBackdropClick}></div>
    <div class="dropdown" role="listbox" tabindex="-1" on:keydown={handleKeydown}>
      <div class="search-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          bind:this={inputElement}
          type="text"
          class="search-input"
          placeholder={searchPlaceholder}
          bind:value={searchQuery}
          on:input={() => dispatch('search', searchQuery)}
        />
      </div>
      <div class="items-list">
        {#if filteredItems.length === 0}
          <div class="no-results">No results found</div>
        {:else}
          {#each filteredItems as item}
            <button
              type="button"
              class="item"
              class:selected={value === item}
              on:click={() => select(item)}
            >
              <span class="item-primary">
                {@html highlightMatch(displayFn(item), searchQuery)}
              </span>
              {#if secondaryFn}
                <span class="item-secondary">
                  {@html highlightMatch(secondaryFn(item), searchQuery)}
                </span>
              {/if}
              {#if value === item}
                <svg class="check" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .search-dropdown {
    position: relative;
  }

  .label {
    display: block;
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-input);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-input);
    font-size: var(--font-size-body);
    color: var(--color-text-primary);
    text-align: left;
    min-height: var(--touch-target-min);
    transition: border-color var(--transition-fast);
  }

  .trigger:not(:disabled):hover {
    border-color: var(--color-text-secondary);
  }

  .trigger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .placeholder {
    color: var(--color-text-secondary);
    flex: 1;
  }

  .selected-value {
    flex: 1;
  }

  .clear-btn {
    padding: var(--space-xs);
    color: var(--color-text-secondary);
    opacity: 0.7;
  }

  .clear-btn:hover {
    opacity: 1;
  }

  .chevron {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    transition: transform var(--transition-fast);
  }

  .open .chevron {
    transform: rotate(180deg);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--space-xs);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-dropdown);
    z-index: 101;
    overflow: hidden;
  }

  .search-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
  }

  .search-input {
    flex: 1;
    font-size: var(--font-size-body);
    color: var(--color-text-primary);
    background: transparent;
  }

  .search-input::placeholder {
    color: var(--color-text-secondary);
  }

  .items-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    text-align: left;
    transition: background var(--transition-fast);
  }

  .item:hover {
    background: var(--color-bg-input);
  }

  .item.selected {
    background: var(--color-bg-input);
  }

  .item-primary {
    flex: 1;
    font-size: var(--font-size-body);
  }

  .item-secondary {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .check {
    flex-shrink: 0;
    color: var(--color-accent-success);
  }

  .no-results {
    padding: var(--space-lg);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-secondary);
  }

  :global(.item mark) {
    background: var(--color-accent-warning);
    color: var(--color-bg-primary);
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
