import { FlowEditor } from '@/index.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ width: '100vw', height: '100vh' }}>
      <FlowEditor />
    </div>
  </StrictMode>
)
