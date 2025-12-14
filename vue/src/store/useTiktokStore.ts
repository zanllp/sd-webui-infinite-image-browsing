import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface TiktokMediaItem {
  url: string
  type: 'image' | 'video' | 'audio'
  id: string
  [key: string]: any // 允许额外的属性
}

export const useTiktokStore = defineStore('useTiktokStore', () => {

  
  // 基本状态
  const visible = ref(false)
  const isFullscreen = ref(false)
  const mediaList = ref<TiktokMediaItem[]>([])
  const currentIndex = ref(0)
  
  // 计算属性
  const currentItem = computed(() => {
    return mediaList.value[currentIndex.value] || null
  })
  
  const hasNext = computed(() => {
    return currentIndex.value < mediaList.value.length - 1
  })
  
  const hasPrev = computed(() => {
    return currentIndex.value > 0
  })
  
  // 检测是否为移动设备
  const isMobile = computed(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768
  })
  
  // 动作
  const openTiktokView = (items: TiktokMediaItem[], startIndex = 0) => {
    mediaList.value = items
    currentIndex.value = Math.max(0, Math.min(startIndex, items.length - 1))
    visible.value = true
    
    // 移动设备自动全屏
    if (isMobile.value) {
      isFullscreen.value = true
    }
  }
  
  const closeView = () => {
    isFullscreen.value = false
    mediaList.value = []
    currentIndex.value = 0
    setTimeout(() => {
      
      visible.value = false
    }, 300);
  }
  
  const next = () => {
    if (hasNext.value) {
      currentIndex.value++
    }
  }
  
  const prev = () => {
    if (hasPrev.value) {
      currentIndex.value--
    }
  }
  
  const goToIndex = (index: number) => {
    if (index >= 0 && index < mediaList.value.length) {
      currentIndex.value = index
    }
  }
  
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }
  
  return {
    // 状态
    visible,
    isFullscreen,
    mediaList,
    currentIndex,
    
    // 计算属性
    currentItem,
    hasNext,
    hasPrev,
    isMobile,
    
    // 动作
    openTiktokView,
    closeView,
    next,
    prev,
    goToIndex,
    toggleFullscreen
  }
}) 