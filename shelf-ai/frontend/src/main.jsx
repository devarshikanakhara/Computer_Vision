import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#21262d',
            color: '#f0f6fc',
            border: '1px solid #30363d',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00e5c8', secondary: '#080b12' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#080b12' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
