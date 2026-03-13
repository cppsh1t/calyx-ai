import React from 'react'
import HelloWorld from 'temp-test'
import './index.css'

export function App() {
  return React.createElement('div', { className: 'app' }, React.createElement(HelloWorld, null))
}

export default App
