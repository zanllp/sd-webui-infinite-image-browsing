import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { env } from 'node:process'
const isProd = env.NODE_ENV === "production"

// https://vitejs.dev/config/
export default defineConfig({
  base: isProd ? '/baidu_netdisk/fe-static' : '/', css: {
    preprocessorOptions: {
      modules: true,
      less: {
        javascriptEnabled: true,
      }
    }
  },
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
