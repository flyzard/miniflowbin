<script lang="ts">
  export let title: string = '';
</script>

<main class="page">
  <slot name="nav" />
  <div class="card">
    {#if title}<h1>{title}</h1>{/if}
    <slot />
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: var(--space-md);
    background: var(--color-bg-primary);
  }

  .card {
    background: var(--color-bg-card);
    border-radius: var(--radius-card);
    padding: var(--space-lg);
    max-width: 480px;
    margin: 0 auto;
  }

  h1 {
    font-size: var(--font-size-section);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-xs);
  }
</style>
