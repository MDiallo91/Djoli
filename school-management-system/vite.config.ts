import { defineConfig } from "vite"
import path from "node:path"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron/simple"

export default defineConfig(({ mode }) => {
  // In test mode, don't use electron plugin (it requires Electron binaries)
  if (mode === 'test') {
    return {
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules', 'dist', 'dist-electron'],
        coverage: {
          reporter: ['text', 'lcov'],
          exclude: ['node_modules/', 'src/test/', 'electron/'],
        },
      },
      resolve: {
        alias: { '@': path.resolve(__dirname, 'src') }
      }
    }
  }

  return {
    plugins: [
      react(),
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            build: {
              target: "node18",
              rollupOptions: { external: ["sql.js", "bcryptjs"] }
            }
          }
        },
        preload: {
          input: path.join(__dirname, "electron/preload.ts"),
          vite: {
            build: {
              rollupOptions: {
                output: { entryFileNames: "preload.js", format: "cjs" }
              }
            }
          }
        }
      })
    ]
  }
})
