import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import type { DataSource } from './atlas/data.ts'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

// Every data URL resolves against the Pages subpath, never the site root.
const source: DataSource = {
  fetch: (url) => fetch(url),
  base: new URL(import.meta.env.BASE_URL, window.location.href),
}

// Reaching localStorage itself can throw when site data is blocked.
function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

createRoot(root).render(
  <StrictMode>
    <App source={source} storage={browserStorage()} />
  </StrictMode>,
)
