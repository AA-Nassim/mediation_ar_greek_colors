import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'public/models/*', dest: 'models' },
        { src: 'public/wasm/*', dest: 'wasm' },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/onnxruntime-web')) return 'onnx'
        },
      },
    },
  },
  server: {
    allowedHosts: true,
  }
})
