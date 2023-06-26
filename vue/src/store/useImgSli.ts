import { FileNodeInfo } from '@/api/files'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asyncComputed } from '@vueuse/core'
import { createImage } from '@/util'
import { toRawFileUrl } from '@/page/fileTransfer/util'

export const useImgSliStore = defineStore('useImgSliStore', () => {
  const splitPercent = ref(50)
  const fileDragging = ref(false)
  const drawerVisible = ref(false)
  const left = ref<FileNodeInfo>()
  const right = ref<FileNodeInfo>()
  
const maxEdge = asyncComputed(async () => {
  if (!left.value) {
    return 'width'
  }
  const l = await createImage(toRawFileUrl(left.value))
  const aspectRatio = l.width / l.height
  const clientAR = document.body.clientWidth / document.body.clientHeight
  return aspectRatio > clientAR ? 'width' : 'height'
})
  return {
    drawerVisible,
    splitPercent,
    fileDragging,
    left,
    right,
    maxEdge
  }
})
