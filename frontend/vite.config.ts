import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // Sub-jalur tempat aplikasi dipasang, mis. '/stunting-balita/'.
  // Vite menanamkan nilai ini ke index.html saat build, sehingga aset dirujuk
  // sebagai /stunting-balita/assets/... dan bukan /assets/... yang akan 404
  // begitu aplikasi tidak lagi berada di akar domain. Karena ditanam saat
  // build, mengubah sub-jalur berarti build ulang, bukan sekadar restart.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
})
