import '@/styles/globals.css'
import '@/app/i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Providers } from '@/app/providers'

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root element')

createRoot(root).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
)
