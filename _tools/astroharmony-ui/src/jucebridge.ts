// Thin shim around JUCE 8 WebView2 native interop.
//
// JUCE exposes its API as ES module exports from juce/index.js. We vendor that
// file into the bundle (Vite + vite-plugin-singlefile inlines it). In a plain
// browser, getNativeFunction returns a thing that posts no-op messages —
// calls hang forever — so we add a defensive fallback.

// @ts-expect-error — vendored plain JS, no .d.ts. We type the export ourselves below.
import { getNativeFunction as juceGetNativeFunction } from './juce/index.js'

type JuceFn = (...args: unknown[]) => Promise<unknown>

declare global {
  interface Window {
    __JUCE__?: { backend?: unknown }
  }
}

export function inJuce(): boolean {
  return typeof window.__JUCE__ !== 'undefined' && !!window.__JUCE__?.backend
}

export async function callNative<T = unknown>(name: string, ...args: unknown[]): Promise<T> {
  if (inJuce()) {
    const fn = juceGetNativeFunction(name) as JuceFn
    return (await fn(...args)) as T
  }
  return `[stub] ${name}(${args.map((a) => JSON.stringify(a)).join(', ')})` as T
}
