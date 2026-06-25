
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'

const MAX_SESSIONS = 50

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const d = Math.floor(diff / 86_400_000)
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(ts).toLocaleDateString()
}

interface Props {
  open: boolean
  onClose: () => void
  anchorLeft: number
  anchorTop: number
}

export default function ProjectMenu({ open, onClose, anchorLeft, anchorTop }: Props) {
  const {
    sessions, activeSessionId,
    createSession, loadSession, deleteSession, renameSession, duplicateSession, saveCurrentSession,
  } = useStore()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  // `saveAsName === null` means the "Save as new" modal is closed.
  // Electron's renderer disables window.prompt() for security, so we roll our
  // own modal instead of relying on the browser dialog.
  const [saveAsName, setSaveAsName] = useState<string | null>(null)

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return
      // Treat clicks inside the "Save as new" modal as inside the menu too,
      // so the menu doesn't tear itself (and the modal with it) down when
      // the user clicks the modal's Save button.
      if (rootRef.current.contains(e.target as Node)) return
      if (modalRef.current && modalRef.current.contains(e.target as Node)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // Defer to next tick so the toggle click doesn't immediately close us.
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
  const atCap = sessions.length >= MAX_SESSIONS

  function handleNew() {
    if (atCap) { alert(`Max ${MAX_SESSIONS} sessions reached. Delete one first.`); return }
    createSession()
    onClose()
  }

  function handleSaveAs() {
    if (atCap) { alert(`Max ${MAX_SESSIONS} sessions reached. Delete one first.`); return }
    setSaveAsName('')
  }

  function confirmSaveAs() {
    const name = (saveAsName ?? '').trim()
    if (!name) { setSaveAsName(null); return }
    // Persist current state into the active session first, then duplicate it
    // under the new name. Cleaner than building an empty session then copying.
    saveCurrentSession()
    const before = useStore.getState().activeSessionId
    if (!before) {
      createSession(name)
      saveCurrentSession()
    } else {
      duplicateSession(before)
      const dupId = useStore.getState().activeSessionId
      if (dupId) renameSession(dupId, name)
    }
    setSaveAsName(null)
    onClose()
  }

  function handleLoad(id: string) {
    if (id === activeSessionId) { onClose(); return }
    loadSession(id)
    onClose()
  }

  function handleDelete(id: string) {
    const target = sessions.find(s => s.id === id)
    if (!target) return
    if (!confirm(`Delete "${target.name}"?`)) return
    deleteSession(id)
  }

  function handleDuplicate(id: string) {
    if (atCap) { alert(`Max ${MAX_SESSIONS} sessions reached. Delete one first.`); return }
    duplicateSession(id)
    onClose()
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditName(currentName)
  }

  function commitRename() {
    if (editingId && editName.trim()) renameSession(editingId, editName.trim())
    setEditingId(null)
    setEditName('')
  }

  return (
    <>
    {saveAsName !== null && (
      <div
        ref={modalRef}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.55)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) setSaveAsName(null) }}
      >
        <div style={{
          background: 'var(--cc-bg-panel)', border: '1px solid var(--cc-border)',
          borderRadius: 10, padding: '1.1rem 1.2rem', minWidth: 320,
          boxShadow: '0 12px 32px rgba(0,0,0,.55)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cc-text)', marginBottom: 10 }}>
            Save as new session
          </div>
          <input
            autoFocus
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmSaveAs()
              else if (e.key === 'Escape') setSaveAsName(null)
            }}
            placeholder="Session name"
            style={{
              width: '100%', padding: '.5rem .65rem',
              background: 'var(--cc-bg-elev)', color: 'var(--cc-text)',
              border: '1px solid var(--cc-border)', borderRadius: 6,
              fontSize: 13, fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setSaveAsName(null)}
              style={{
                padding: '.4rem .75rem', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--cc-border)',
                color: 'var(--cc-text-dim)', cursor: 'pointer', fontSize: 12,
              }}
            >Cancel</button>
            <button
              onClick={confirmSaveAs}
              disabled={!saveAsName.trim()}
              style={{
                padding: '.4rem .85rem', borderRadius: 6,
                background: saveAsName.trim() ? 'var(--cc-accent)' : 'var(--cc-bg-elev)',
                border: '1px solid ' + (saveAsName.trim() ? 'var(--cc-accent)' : 'var(--cc-border)'),
                color: saveAsName.trim() ? '#fff' : 'var(--cc-text-mute)',
                cursor: saveAsName.trim() ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 600,
              }}
            >Save</button>
          </div>
        </div>
      </div>
    )}
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        top: anchorTop,
        left: anchorLeft,
        width: 320,
        maxHeight: 520,
        background: 'var(--cc-bg-panel)',
        border: '1px solid var(--cc-border)',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {/* Top: New */}
      <button onClick={handleNew} style={menuItem}>
        <span>＋ New empty project</span>
      </button>

      <Divider />

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
        <div style={sectionLabel}>
          Saved sessions ({sessions.length} / {MAX_SESSIONS})
        </div>
        {sortedSessions.length === 0 && (
          <div style={{ padding: '.6rem .8rem', fontSize: 11, color: 'var(--cc-text-mute)', fontStyle: 'italic' }}>
            No saved sessions yet
          </div>
        )}
        {sortedSessions.map(s => {
          const isActive = s.id === activeSessionId
          const isHover = hoveredId === s.id
          const isEditing = editingId === s.id
          return (
            <div
              key={s.id}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '.45rem .55rem .45rem .8rem',
                background: isHover ? 'rgba(255,255,255,.04)' : 'transparent',
                cursor: isEditing ? 'default' : 'pointer',
                borderLeft: `3px solid ${isActive ? 'var(--cc-accent)' : 'transparent'}`,
              }}
              onClick={() => !isEditing && handleLoad(s.id)}
            >
              <span style={{
                fontSize: 10, width: 10, color: isActive ? 'var(--cc-accent)' : 'transparent',
              }}>●</span>

              {isEditing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') { setEditingId(null); setEditName('') }
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, background: 'var(--cc-bg-elev)',
                    border: '1px solid var(--cc-accent)', color: 'var(--cc-text)',
                    borderRadius: 4, padding: '.2rem .4rem', fontSize: 12,
                    fontFamily: 'DM Sans, sans-serif', outline: 'none',
                  }}
                />
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: 'var(--cc-text)', fontWeight: isActive ? 600 : 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontSize: 10, color: 'var(--cc-text-mute)', letterSpacing: '.04em',
                  }}>
                    {s.chordCount} chord{s.chordCount === 1 ? '' : 's'} · {s.bars} bar{s.bars === 1 ? '' : 's'} · {formatRelative(s.updatedAt)}
                  </div>
                </div>
              )}

              {!isEditing && isHover && (
                <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => startRename(s.id, s.name)} title="Rename" style={iconAction}>✏</button>
                  <button onClick={() => handleDuplicate(s.id)} title="Duplicate" style={iconAction}>⎘</button>
                  <button onClick={() => handleDelete(s.id)} title="Delete" style={{ ...iconAction, color: 'var(--cc-warn, #e687a0)' }}>✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Divider />

      <button onClick={handleSaveAs} style={menuItem}>
        <span>💾 Save current as new...</span>
      </button>
    </div>
    </>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--cc-border-soft)' }} />
}

const menuItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '.6rem .8rem',
  background: 'transparent',
  border: 'none',
  color: 'var(--cc-text)',
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'DM Sans, sans-serif',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.12em',
  color: 'var(--cc-text-mute)',
  fontWeight: 600,
  padding: '.55rem .8rem .25rem',
  textTransform: 'uppercase',
}

const iconAction: React.CSSProperties = {
  width: 22, height: 22,
  border: 'none',
  background: 'rgba(255,255,255,.06)',
  color: 'var(--cc-text-dim)',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 11,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Sans, sans-serif',
}
