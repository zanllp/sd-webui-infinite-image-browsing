import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  base: 'baidu_netdisk/fe-static',
  plugins: [vue(),
  Components({
    resolvers: [AntDesignVueResolver({ importStyle: 'css' })],
  }),],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/baidu_netdisk/': {
        target: 'http://127.0.0.1:7860/'
      }
    }
  }
})
