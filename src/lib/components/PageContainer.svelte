<script lang="ts">
  export let padding: boolean = true;
</script>

<main class="page-container" class:with-padding={padding}>
  <slot />
</main>

<style>
  .page-container {
    flex: 1;
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--color-bg-primary);
  }

  .with-padding {
    padding: var(--space-md);
  }
</style>
