import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})


//import { defineConfig } from 'vite'
//import react from '@vitejs/plugin-react'
//import path from 'path'
//import { fileURLToPath } from 'url'

//// Ёмул€ци€ __dirname дл€ ESM
//const __filename = fileURLToPath(import.meta.url)
//const __dirname = path.dirname(__filename)

//export default defineConfig({
//    plugins: [react()],
//    resolve: {
//        alias: {
//            '@': path.resolve(__dirname, './src'),
//        },
//    },
//    optimizeDeps: {
//        include: ['react-slickgrid', 'jquery', 'bootstrap'],
//    },
//    build: {
//        commonjsOptions: {
//            include: [/node_modules/],
//        },
//    },
//})