import React from 'react'
import { createRoot } from 'react-dom/client'
import './tw.css'
import App from './App.js'
import PasswordSetup from './setup.jsx'

// Prototype prop defaults from the design file's data-props block.
const defaults = {
  startDirection: 'A',
  startView: 'intelligence',
  showRiskPath: true,
}

/* Fresh visits (root or an invite link) start at the invite screen;
   continuing drops the user into the Intelligence view. Reloads while
   already inside the app (/intelligence, /identities, /report) skip it. */
function Root() {
  const [done, setDone] = React.useState(() =>
    /^\/(intelligence|identities|policies|report)/.test(window.location.pathname),
  )
  if (!done) {
    return React.createElement(PasswordSetup, {
      onComplete: () => {
        // App restores its last view from localStorage on mount — steer the
        // post-setup landing to Intelligence regardless of prior state.
        try {
          const s = JSON.parse(localStorage.getItem('mid-iv') || '{}')
          s.view = 'intelligence'
          localStorage.setItem('mid-iv', JSON.stringify(s))
        } catch (e) {}
        setDone(true)
      },
    })
  }
  return React.createElement(App, defaults)
}

createRoot(document.getElementById('root')).render(
  React.createElement(Root),
)
