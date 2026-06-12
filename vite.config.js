import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),   // ← enables HTTPS so mobile browsers allow GPS
  ],
  server: {
    https: true,
    host: true,   // expose to local network (your phone)
    port: 5174,
  }
})
