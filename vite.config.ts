import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/stag-tracker/',
  server: {
    host: true,
    // Allow public tunnel hostnames (cloudflared, localtunnel, ngrok) so Vite
    // doesn't reject requests when testing the camera on a phone.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.ngrok.io'],
  },
})
