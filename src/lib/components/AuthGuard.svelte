<script lang="ts">
  import { onMount } from 'svelte';
  import { push, location } from 'svelte-spa-router';
  import { authStore, authStatus } from '../auth/authStore';

  /** Paths that don't require authentication */
  const AUTH_PATHS = ['/auth/activate', '/auth/setup-pin', '/auth/login', '/auth/locked'];

  let ready = false;

  $: status = $authStatus;
  $: currentPath = $location;

  // Check if current path is an auth path (doesn't need protection)
  $: isAuthPath = AUTH_PATHS.some(path => currentPath.startsWith(path));

  onMount(() => {
    // Wait for auth initialization
    const unsubscribe = authStore.subscribe(state => {
      if (state.status === 'initializing') return;

      ready = true;

      // Don't redirect if we're on an auth path
      if (isAuthPath) return;

      // Redirect based on auth state
      handleAuthRedirect(state.status);
    });

    return unsubscribe;
  });

  // React to status changes
  $: if (ready && !isAuthPath) {
    handleAuthRedirect(status);
  }

  function handleAuthRedirect(authStatus: string) {
    switch (authStatus) {
      case 'not_activated':
      case 'activation_required':
        push('/auth/activate');
        break;
      case 'revoked':
      case 'suspended':
        push('/auth/locked');
        break;
      case 'login_required':
        push('/auth/login');
        break;
      case 'authenticated':
        // Good to go - no redirect needed
        break;
    }
  }
</script>

{#if !ready}
  <div class="auth-loading">
    <div class="spinner"></div>
    <span>Loading...</span>
  </div>
{:else if isAuthPath || status === 'authenticated'}
  <slot />
{:else}
  <!-- Redirecting... -->
  <div class="auth-loading">
    <div class="spinner"></div>
  </div>
{/if}

<style>
  .auth-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    min-height: 100dvh;
    gap: var(--space-md);
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
