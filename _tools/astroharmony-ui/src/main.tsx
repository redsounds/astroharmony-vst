import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Bundle the production fonts inline so the plugin doesn't depend on network.
// @fontsource packages emit @font-face declarations with WOFF2 data URLs.
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'

import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
