import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Dit zorgt ervoor dat 'process.env.API_KEY' in jouw code wordt vervangen
      // door de waarde van VITE_API_KEY die je in Vercel instelt.
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || process.env.VITE_API_KEY),
    },
  };
});