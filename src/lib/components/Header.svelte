<script lang="ts">
  import { selectedDc } from '../stores/distributionCenter';
</script>

<header class="header">
  <div class="logo">FlowBin</div>
  <div class="dc-info">
    {#if $selectedDc}
      <span class="dc-name">{$selectedDc.name}</span>
      <span class="dc-code">{$selectedDc.code}</span>
    {:else}
      <span class="dc-name">No DC Selected</span>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .logo {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .dc-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    text-align: right;
  }

  .dc-name {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }

  .dc-code {
    font-size: var(--font-size-caption);
    color: var(--color-text-secondary);
    background: var(--color-bg-input);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-button);
  }
</style>
