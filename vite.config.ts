import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Note: we used to set up a /yfproxy/* dev proxy to Yahoo Finance, but Yahoo
// aggressively rate-limits server-side IPs (returns 429 from most cloud /
// dev environments). The live data layer in src/data/yahoo.ts routes
// browser-direct through corsproxy.io instead, which is what reliably works
// at runtime. Override with VITE_YAHOO_PROXY if you want your own worker.
export default defineConfig({
  plugins: [react()],
})
