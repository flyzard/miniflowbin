<script lang="ts">
  /** Loading message to display */
  export let message: string = 'Loading...';
</script>

<div class="step-content loading-center">
  <div class="loading-indicator">
    <div class="spinner"></div>
    <p>{message}</p>
  </div>
</div>
