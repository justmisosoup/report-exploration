import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// '@' mirrors the app repo's src alias so design-system/core components can
// resolve '@/utils/twUtils' unchanged.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./design-system', import.meta.url)),
    },
  },
})
