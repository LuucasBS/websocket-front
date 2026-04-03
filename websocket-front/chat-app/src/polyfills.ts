// SockJS expects a Node-like global reference in some builds.
if (typeof globalThis !== 'undefined' && !('global' in globalThis)) {
  (globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;
}
