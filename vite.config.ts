import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Относительные пути, чтобы сборка открывалась из подпапки на GitHub Pages
  base: './',
  test: {
    environment: 'node',
  },
});
