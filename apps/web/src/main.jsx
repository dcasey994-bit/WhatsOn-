import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { initTheme } from './data/themeStore.js'
import { isNative } from './lib/platform.js'
import './index.css'
import App from './App.jsx'

initTheme()

if (!isNative()) registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
