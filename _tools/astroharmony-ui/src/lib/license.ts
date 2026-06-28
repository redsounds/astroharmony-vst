/**
 * Offline license validation — ported from cinematic-composer/lib/license.ts.
 *
 * Algorithm + hash list are IDENTICAL to the Electron app, so any license
 * key that worked there will work in the plugin too.
 *
 *   1. User pastes a code, e.g. "AB12-CD34-EF56-GH78".
 *   2. SubtleCrypto hashes it with SHA-256.
 *   3. We look the hex digest up in the shipped hash list (license-codes.json).
 *   4. On a match, we persist the original (normalised) code.
 *
 * Persistence in the plugin: a native fn writes the code to
 * %APPDATA%/AstroHarmony/license.txt so the activation survives across DAW
 * sessions and project loads. In a plain browser (component dev outside the
 * plugin), we fall back to localStorage with the same key the Electron app
 * uses, so the two stores are interchangeable when porting/testing.
 */

import hashes from './license-codes.json'
import { callNative, inJuce } from '@/jucebridge'

const STORAGE_KEY = 'ah_license_code'
const VALID_HASHES = new Set<string>(hashes as string[])

/** Canonicalise user input: strip spaces, uppercase, normalise dashes. */
export function normaliseCode(raw: string): string {
  const cleaned = raw.replace(/[\s–—]/g, '-').toUpperCase()
  // Collapse multiple dashes and trim leading/trailing dashes.
  return cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Returns true if the code is in the shipped hash set. Pure check — no side effects. */
export async function isValidCode(code: string): Promise<boolean> {
  const normalised = normaliseCode(code)
  if (!normalised) return false
  const hex = await sha256Hex(normalised)
  return VALID_HASHES.has(hex)
}

// ── Persistence shim ─────────────────────────────────────────────────
// In the plugin, the license lives in a file under %APPDATA% via native
// fns; in a browser, in localStorage. Both code paths use the same
// `ah_license_code` key so the data is shape-identical.

async function readSavedCode(): Promise<string | null> {
  if (inJuce()) {
    try {
      const res = await callNative<string>('getLicenseCode')
      return typeof res === 'string' && res.length > 0 ? res : null
    } catch { return null }
  }
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

async function writeSavedCode(code: string): Promise<void> {
  if (inJuce()) {
    try { await callNative('setLicenseCode', code) } catch { /* ignore */ }
    return
  }
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* ignore */ }
}

async function eraseSavedCode(): Promise<void> {
  if (inJuce()) {
    try { await callNative('setLicenseCode', '') } catch { /* ignore */ }
    return
  }
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

/** Activate: validate and, on success, persist the code so future launches skip the gate. */
export async function activateLicense(code: string): Promise<boolean> {
  const ok = await isValidCode(code)
  if (!ok) return false
  await writeSavedCode(normaliseCode(code))
  return true
}

/** Used by the gate on mount — already licensed? */
export async function isAlreadyLicensed(): Promise<boolean> {
  const saved = await readSavedCode()
  if (!saved) return false
  // Re-validate the stored code against the shipped hash list. This means
  // a future version that rotates the hash list will silently re-prompt
  // affected users instead of trusting a stale stored entry.
  return await isValidCode(saved)
}

/** Clear license — used by Settings → "Deactivate this device" if we add one later. */
export async function clearLicense(): Promise<void> {
  await eraseSavedCode()
}
