import React from 'react'
import FlowEditor from 'calyx-flow-editor'
import './index.css'

export function App() {
  return React.createElement('div', { className: 'app' }, React.createElement(FlowEditor, null))
}

export default App
