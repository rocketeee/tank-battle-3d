import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const SDK_SCRIPT = 'https://www.youtube.com/game_api/v1';

function playablesSdkPlugin(): Plugin {
  return {
    name: 'playables-sdk',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const tag = `    <script src="${SDK_SCRIPT}"></script>`;
        return html.replace('<head>', `<head>\n${tag}`);
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const playables = mode === 'playables';
  return {
    base: './',
    define: {
      __PLAYABLES__: JSON.stringify(playables),
    },
    plugins: playables
      ? [
          playablesSdkPlugin(),
          {
            name: 'playables-platform',
            enforce: 'pre',
            resolveId(id) {
              const normalized = id.replace(/\\/g, '/');
              if (
                normalized === './platform' ||
                normalized === './platform.ts' ||
                normalized === './game/platform' ||
                normalized === './game/platform.ts' ||
                normalized.endsWith('/game/platform.ts')
              ) {
                return fileURLToPath(new URL('./src/game/platform.playables.ts', import.meta.url));
              }
              return null;
            },
          },
        ]
      : [],
    server: {
      host: true,
      port: playables ? 5174 : 5173,
    },
    build: {
      outDir: playables ? 'dist-playables' : 'dist',
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: playables
        ? {
            output: {
              manualChunks(id) {
                if (id.includes('/node_modules/three/')) return 'three';
              },
            },
          }
        : undefined,
    },
  };
});
