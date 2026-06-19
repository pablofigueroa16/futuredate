import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// nitro() solo en `build` (genera la salida que Vercel autodetecta como Functions).
// En `dev` lo omitimos: el server de Nitro v3 beta da "ssr unavailable" de forma
// intermitente; el dev nativo de TanStack Start es estable. Debe ir entre
// tanstackStart() y viteReact().
const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    ...(command === 'build' ? [nitro()] : []),
    viteReact(),
  ],
}))

export default config
