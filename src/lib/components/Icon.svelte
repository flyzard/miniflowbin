<script lang="ts">
  type IconName =
    | 'arrow-down' | 'arrow-up' | 'arrow-right' | 'arrow-left'
    | 'chevron-left' | 'chevron-down'
    | 'check' | 'check-circle' | 'x' | 'x-circle'
    | 'search' | 'map-pin' | 'package' | 'plus' | 'hash' | 'user' | 'calendar'
    | 'alert-triangle' | 'info-circle';

  type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  export let name: IconName;
  export let size: IconSize = 'md';
  export let strokeWidth: number = 2;

  const sizes: Record<IconSize, number> = {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 48
  };

  $: pixelSize = sizes[size];
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={pixelSize}
  height={pixelSize}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#if name === 'arrow-down'}
    <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
  {:else if name === 'arrow-up'}
    <path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
  {:else if name === 'arrow-right'}
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  {:else if name === 'arrow-left'}
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  {:else if name === 'chevron-left'}
    <path d="m15 18-6-6 6-6"/>
  {:else if name === 'chevron-down'}
    <polyline points="6 9 12 15 18 9"/>
  {:else if name === 'check'}
    <polyline points="20 6 9 17 4 12"/>
  {:else if name === 'check-circle'}
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  {:else if name === 'x'}
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  {:else if name === 'x-circle'}
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  {:else if name === 'map-pin'}
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  {:else if name === 'package'}
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  {:else if name === 'plus'}
    <path d="M5 12h14"/><path d="M12 5v14"/>
  {:else if name === 'hash'}
    <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
  {:else if name === 'user'}
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  {:else if name === 'calendar'}
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  {:else if name === 'alert-triangle'}
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  {:else if name === 'info-circle'}
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  {/if}
</svg>
