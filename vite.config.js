import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Это ГЛАВНОЕ: заставляет пути быть относительными
  build: {
    outDir: 'dist', // Куда собирать билд
  }
})