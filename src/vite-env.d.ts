/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType;
  export default component;
}

declare module 'jeep-sqlite/loader' {
  export function defineCustomElements(win?: Window): Promise<void>;
}
