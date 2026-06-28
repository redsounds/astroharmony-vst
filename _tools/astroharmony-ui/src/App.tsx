import { useEffect } from 'react'
import WriteWorkspaceV2 from './components/v2/WriteWorkspaceV2'
import LicenseGate from './components/v2/LicenseGate'
import { initStateSync } from '@/lib/stateSync'

export default function App() {
  useEffect(() => {
    void initStateSync()

    // Suppress WebView2's default browser context menu (Back / Refresh /
    // Save as / Print / More tools) — irrelevant inside a plugin UI and
    // looks unprofessional. React onContextMenu handlers still fire first
    // and can preventDefault on their own if any component ever needs a
    // custom right-click action.
    const blockContextMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', blockContextMenu)
    return () => document.removeEventListener('contextmenu', blockContextMenu)
  }, [])
  return (
    <LicenseGate>
      <WriteWorkspaceV2 />
    </LicenseGate>
  )
}
