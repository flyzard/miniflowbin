<script lang="ts">
  export let currentStep: number;
  export let totalSteps: number;
  export let stepName: string;
</script>

<div class="step-indicator">
  <div class="dots">
    {#each Array(totalSteps) as _, i}
      <div
        class="dot"
        class:completed={i + 1 < currentStep}
        class:current={i + 1 === currentStep}
      ></div>
    {/each}
  </div>
  <p class="step-label">{stepName}</p>
</div>

<style>
  .step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .dots {
    display: flex;
    gap: var(--space-sm);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--color-border-subtle);
    background: transparent;
    transition: all var(--transition-fast);
  }

  .dot.completed {
    background: var(--color-accent-success);
    border-color: var(--color-accent-success);
  }

  .dot.current {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
  }

  .step-label {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
  }
</style>
