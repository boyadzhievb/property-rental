import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setUpServiceWorker } from './pwa'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.addEventListener('load', () => {
  setUpServiceWorker().catch((error: unknown) => console.error('Service worker setup failed:', error))
})
