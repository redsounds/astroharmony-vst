
import { useEffect, useRef, useState } from 'react'
import { activateLicense, isAlreadyLicensed, normaliseCode } from '@/lib/license'

type Status = 'checking' | 'ok' | 'needed' | 'verifying' | 'invalid'

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('checking')
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Initial check — already licensed? Skip the gate if so.
  useEffect(() => {
    let alive = true
    isAlreadyLicensed().then((ok) => {
      if (!alive) return
      setStatus(ok ? 'ok' : 'needed')
    })
    return () => { alive = false }
  }, [])

  // Autofocus input the moment the gate becomes visible.
  useEffect(() => {
    if (status === 'needed' || status === 'invalid') inputRef.current?.focus()
  }, [status])

  async function handleSubmit() {
    if (status === 'verifying') return
    setStatus('verifying')
    const ok = await activateLicense(code)
    setStatus(ok ? 'ok' : 'invalid')
  }

  // While we're still resolving licensure state, render nothing so the app
  // doesn't flash unlicensed UI before the gate appears.
  if (status === 'checking') return null
  if (status === 'ok') return <>{children}</>

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--cc-bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: 'calc(100% - 32px)',
          background: 'var(--cc-bg-panel)',
          border: '1px solid var(--cc-border)',
          borderRadius: 14,
          padding: '1.6rem 1.7rem',
          boxShadow: '0 16px 48px rgba(0,0,0,.55)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: 22, fontWeight: 500, letterSpacing: '.06em',
            color: 'var(--cc-text)',
            marginBottom: 6,
          }}
        >
          AstroHarmony
        </div>
        <div style={{ fontSize: 11, color: 'var(--cc-text-mute)', letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 18 }}>
          License activation
        </div>

        <div style={{ fontSize: 13, color: 'var(--cc-text-dim)', lineHeight: 1.55, marginBottom: 14 }}>
          Enter the license key you received with your purchase. You only need to do this once on this device.
        </div>

        <input
          ref={inputRef}
          value={code}
          onChange={(e) => {
            setCode(normaliseCode(e.target.value))
            if (status === 'invalid') setStatus('needed')
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          spellCheck={false}
          autoComplete="off"
          style={{
            width: '100%', padding: '.7rem .85rem',
            background: 'var(--cc-bg-elev)',
            color: 'var(--cc-text)',
            border: '1px solid ' + (status === 'invalid' ? 'var(--cc-warn, #e687a0)' : 'var(--cc-border)'),
            borderRadius: 8,
            fontSize: 15, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            letterSpacing: '.12em',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        />

        {status === 'invalid' && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--cc-warn, #e687a0)' }}>
            That key isn&apos;t valid. Check for typos and try again.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || status === 'verifying'}
            style={{
              padding: '.55rem 1.4rem', borderRadius: 8,
              background: code.trim() ? 'var(--cc-accent)' : 'var(--cc-bg-elev)',
              border: '1px solid ' + (code.trim() ? 'var(--cc-accent)' : 'var(--cc-border)'),
              color: code.trim() ? '#fff' : 'var(--cc-text-mute)',
              cursor: code.trim() && status !== 'verifying' ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {status === 'verifying' ? 'Activating…' : 'Activate'}
          </button>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--cc-border-soft)', fontSize: 10.5, color: 'var(--cc-text-mute)', lineHeight: 1.55 }}>
          Lost your key? Contact support with your purchase receipt.
        </div>
      </div>
    </div>
  )
}
