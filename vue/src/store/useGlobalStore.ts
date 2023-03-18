import type { GlobalConf } from '@/api'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  return {
    conf
  }
})