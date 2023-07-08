import { FileNodeInfo } from '@/api/files'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useGlobalStore } from './useGlobalStore'
export const useImgSliStore = defineStore('useImgSliStore', () => {
  const fileDragging = ref(false)
  const drawerVisible = ref(false)
  const opened = ref(false)
  const left = ref<FileNodeInfo>()
  const right = ref<FileNodeInfo>()
  const global = useGlobalStore()
  const imgSliActived = computed(() => {
    const tabs = global.tabList
    for (const iter of tabs) {
      if (iter.panes.find(v => v.key === iter.key)?.type === 'img-sli') {
        return true
      }
    }
    return false
  })
  return {
    drawerVisible,
    fileDragging,
    left,
    right,
    imgSliActived,
    opened
  }
})
