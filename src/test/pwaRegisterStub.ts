// Stands in for vite-plugin-pwa's `virtual:pwa-register` in unit tests (vitest does not load
// the PWA plugin). Tests that care mock it with vi.mock.
export function registerSW(): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
