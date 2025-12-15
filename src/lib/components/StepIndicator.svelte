<script lang="ts">
  export let currentStep: number;
  export let totalSteps: number;
  export let stepName: string;
</script>

<p class="step-indicator">
  Step {currentStep} of {totalSteps}: {stepName}
</p>

<style>
  .step-indicator {
    font-size: var(--font-size-secondary);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
  }
</style>
