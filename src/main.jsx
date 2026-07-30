import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'

// Prototype prop defaults from the design file's data-props block.
const defaults = {
  startDirection: 'A',
  startView: 'intelligence',
  showRiskPath: true,
}

createRoot(document.getElementById('root')).render(
  React.createElement(App, defaults),
)
