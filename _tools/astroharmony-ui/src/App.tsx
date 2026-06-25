import { useEffect } from 'react'
import WriteWorkspaceV2 from './components/v2/WriteWorkspaceV2'
import { initStateSync } from '@/lib/stateSync'

export default function App() {
  useEffect(() => {
    void initStateSync()
  }, [])
  return <WriteWorkspaceV2 />
}
