import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EyeMonitorApp from './EyeMonitorApp'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EyeMonitorApp />
  </StrictMode>,
)
