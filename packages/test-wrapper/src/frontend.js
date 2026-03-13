import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'

const elem = document.getElementById('root')

if (!elem) {
  throw new Error('Root element not found')
}

const app = React.createElement(StrictMode, null, React.createElement(App, null))

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem))
  root.render(app)
} else {
  createRoot(elem).render(app)
}
