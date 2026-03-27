import { createRoot } from 'react-dom/client'
import '../dist/uno.css'
import { FlowEditor } from '../src/index.ts'

function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <FlowEditor />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
