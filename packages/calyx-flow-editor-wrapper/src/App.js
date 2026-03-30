import { FlowEditor } from 'calyx-flow-editor'
import 'calyx-flow-editor/tailwind.css'
import React from 'react'
import './index.css'

export function App() {
  return React.createElement('div', { className: 'app' }, React.createElement(FlowEditor, null))
}

export default App
