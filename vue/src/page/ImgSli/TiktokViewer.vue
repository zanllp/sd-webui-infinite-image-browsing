<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useTiktokStore, type TiktokMediaItem } from '@/store/useTiktokStore'
import { useTagStore } from '@/store/useTagStore'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useLocalStorage } from '@vueuse/core'
import { isVideoFile } from '@/util'
import { openAddNewTagModal } from '@/components/functionalCallableComp'
import { toggleCustomTagToImg } from '@/api/db'
import { message } from 'ant-design-vue'
import { 
  CloseOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  UpOutlined,
  DownOutlined,
  TagsOutlined,
  SoundOutlined,
  SoundFilled,
  HeartOutlined,
  HeartFilled,
  PlayCircleOutlined
} from '@/icon'
import { t } from '@/i18n'
import type { StyleValue } from 'vue'
import { throttle } from 'lodash-es'
import { delay } from 'vue3-ts-util'

const tiktokStore = useTiktokStore()
const tagStore = useTagStore()
const global = useGlobalStore()

// 使用 @vueuse 存储用户声音偏好
const isMuted = useLocalStorage('tiktok-viewer-muted', true) // 默认静音

// 自动轮播设置
type AutoPlayMode = 'off' | '5s' | '10s' | '20s'
const autoPlayMode = ref('off' as AutoPlayMode) // useLocalStorage<AutoPlayMode>('iib://tiktok-viewer-autoplay', 'off')
const autoPlayTimer = ref<number | null>(null)

// 自动轮播模式配置
const autoPlayOptions: AutoPlayMode[] = ['off', '5s', '10s', '20s']
const autoPlayLabels = computed(() => ({
  off: t('autoPlayOff'),
  '5s': t('autoPlay5s'),
  '10s': t('autoPlay10s'), 
  '20s': t('autoPlay20s')
}))

// 获取自动轮播延迟时间（毫秒）
const getAutoPlayDelay = (mode: AutoPlayMode): number => {
  switch (mode) {
    case '5s': return 5000
    case '10s': return 10000
    case '20s': return 20000
    default: return 0
  }
}

// 设备检测
const isMac = computed(() => {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) || 
         navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

// 根据设备类型设置延迟时间
const getAnimationDelay = (isTriggerByTouch: boolean) => {
  return isMac.value && !isTriggerByTouch ? 700 : 300 // Mac设备使用1000ms，其他设备300ms
}

// 引用
const containerRef = ref<HTMLElement>()
const viewportRef = ref<HTMLElement>()
const videoRefs = ref<(HTMLVideoElement | null)[]>([null, null, null]) // 视频元素引用

// 3位buffer状态管理
const bufferItems = ref<(TiktokMediaItem | null)[]>([null, null, null]) // [prev, current, next]
const bufferTransform = ref(0) // 当前显示位置的偏移
const isAnimating = ref(false) // 是否正在动画中
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)
const dragOffset = ref(0) // 拖拽偏移量

// TAG 相关状态
const showTags = ref(false)

// 计算属性
const currentItem = computed(() => bufferItems.value[1]) // 中间位置是当前显示的项目

const containerClass = computed(() => {
  return {
    'tiktok-viewer': true,
    'tiktok-viewer--fullscreen': tiktokStore.isFullscreen,
    'tiktok-viewer--floating': !tiktokStore.isFullscreen,
    'tiktok-viewer--mobile': tiktokStore.isMobile
  }
})

// 计算每个buffer项的样式
const getItemStyle = (index: number): StyleValue => {
  const baseTransform = (index - 1) * 100 // -100%, 0%, 100%
  const currentTransform = bufferTransform.value + dragOffset.value
  const totalTransform = baseTransform + currentTransform
  
  return {
    transform: `translateY(${totalTransform}%)`,
    transition: isAnimating.value && !isDragging.value ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
  }
}

// 清除自动轮播计时器
const clearAutoPlayTimer = () => {
  if (autoPlayTimer.value) {
    clearTimeout(autoPlayTimer.value)
    autoPlayTimer.value = null
  }
}

// 启动自动轮播计时器
const startAutoPlayTimer = () => {
  clearAutoPlayTimer()
  
  if (autoPlayMode.value === 'off') return
  
  const currentItem = bufferItems.value[1]
  if (!currentItem) return
  
  // 如果是视频，不需要启动计时器（会在视频结束时自动切换）
  if (isVideoFile(currentItem.url)) return
  
  const delay = getAutoPlayDelay(autoPlayMode.value)
  if (delay > 0) {
    autoPlayTimer.value = window.setTimeout(() => {
      if (!isAnimating.value && !isDragging.value) {
        if (tiktokStore.hasNext) {
          goToNext()
        } else {
          // 到达最后一个时跳回第一个
          goToFirst()
        }
      }
    }, delay)
  }
}

// 处理视频播放结束事件
const handleVideoEnded = (index: number) => {
  // 只处理当前显示的视频（index === 1）
  if (index === 1 && autoPlayMode.value !== 'off' && !isAnimating.value) {
    setTimeout(() => {
      if (tiktokStore.hasNext) {
        goToNext()
      } else {
        // 到达最后一个时跳回第一个
        goToFirst()
      }
    }, 500) // 延迟500ms后切换，避免过于突兀
  }
}

// 控制视频播放
const controlVideoPlayback = async () => {
  await delay(30)
  for (let index = 0; index < videoRefs.value.length; index++) {
    const video = videoRefs.value[index]
    if (!video) continue
    
    try {
      if (index === 1) {
        // 当前显示的视频：自动播放
        video.currentTime = 0 // 重置到开头
        video.muted = isMuted.value // 根据用户偏好设置静音状态
        
        // 添加视频结束事件监听
        video.onended = () => handleVideoEnded(index)
        
        await video.play()
      } else {
        // 非当前显示的视频：暂停并重置
        video.pause()
        video.currentTime = 0
        video.onended = null // 清除事件监听
      }
    } catch (err) {
      console.warn(`视频播放控制失败 (index: ${index}):`, err)
    }
  }
}

// 更新buffer内容
const updateBuffer = () => {
  const currentIndex = tiktokStore.currentIndex
  const list = tiktokStore.mediaList
  
  bufferItems.value = [
    currentIndex > 0 ? list[currentIndex - 1] : null, // prev
    list[currentIndex] || null, // current
    currentIndex < list.length - 1 ? list[currentIndex + 1] : null // next
  ]
  
  // 等待DOM更新后控制视频播放
  nextTick(() => {
    controlVideoPlayback()
    startAutoPlayTimer() // 启动自动轮播计时器
  })
}

// TAG 相关功能
const isTagSelected = (tagId: string | number) => {
  const currentUrl = currentItem.value?.url
  if (!currentUrl) return false
  
  const fullpath = (currentItem.value as any)?.fullpath || currentItem.value?.id
  return !!tagStore.tagMap.get(fullpath)?.some(v => v.id === tagId)
}

// Like 标签相关
const likeTag = computed(() => {
  return global.conf?.all_custom_tags?.find(v => v.type === 'custom' && v.name === 'like')
})

const isLiked = computed(() => {
  if (!likeTag.value) return false
  return isTagSelected(likeTag.value.id)
})

const toggleLike = async () => {
  if (!likeTag.value) return
  await onTagClick(likeTag.value.id)
}

const onTagClick = async (tagId: string | number) => {
  const currentUrl = currentItem.value?.url
  if (!currentUrl) return
  
  try {
    const fullpath = (currentItem.value as any)?.fullpath || currentItem.value?.id
    
    const { is_remove } = await toggleCustomTagToImg({ 
      tag_id: Number(tagId), 
      img_path: fullpath 
    })
    
    const tag = global.conf?.all_custom_tags.find((v) => v.id === tagId)?.name || t('tag')
    await tagStore.refreshTags([fullpath])
    
    message.success(t(is_remove ? 'removedTagFromImage' : 'addedTagToImage', { tag }))
  } catch (error) {
    console.error('Toggle tag error:', error)
    message.error(t('tagOperationFailed'))
  }
}

const tagBaseStyle: StyleValue = {
  margin: '4px',
  padding: '8px 16px',
  borderRadius: '20px',
  display: 'inline-block',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: '0.3s all ease',
  userSelect: 'none',
  fontSize: '14px'
}

// 切换自动轮播模式
const toggleAutoPlay = () => {
  const currentIndex = autoPlayOptions.indexOf(autoPlayMode.value)
  const nextIndex = (currentIndex + 1) % autoPlayOptions.length
  autoPlayMode.value = autoPlayOptions[nextIndex]
  
  // 重新启动计时器
  startAutoPlayTimer()
  
  message.success(t('autoPlayStatus', { mode: autoPlayLabels.value[autoPlayMode.value] }))
}

// 滑动到上一个
const goToPrev = (isTriggerByTouch: boolean = false) => {
  if (isAnimating.value || !tiktokStore.hasPrev) return
  
  // 清除自动轮播计时器
  clearAutoPlayTimer()
  
  isAnimating.value = true
  
  // 重置拖拽偏移
  dragOffset.value = 0
  
  bufferTransform.value = 100 // 向下移动
  
  setTimeout(() => {
    tiktokStore.prev()
    updateBuffer()
    bufferTransform.value = 0
    
    // 简化状态重置逻辑
    setTimeout(() => {
      isAnimating.value = false
    }, getAnimationDelay(isTriggerByTouch))
  }, 200) // 动画一半时间后更新内容
}

// 滑动到下一个
const goToNext = (isTriggerByTouch: boolean = false) => {
  if (isAnimating.value || !tiktokStore.hasNext) return
  
  // 清除自动轮播计时器
  clearAutoPlayTimer()
  
  isAnimating.value = true
  
  // 重置拖拽偏移
  dragOffset.value = 0
  
  bufferTransform.value = -100 // 向上移动
  
  setTimeout(() => {
    tiktokStore.next()
    updateBuffer()
    bufferTransform.value = 0
    
    // 简化状态重置逻辑
    setTimeout(() => {
      isAnimating.value = false
    }, getAnimationDelay(isTriggerByTouch))
  }, 200) // 动画一半时间后更新内容
}

// 跳转到第一个
const goToFirst = (isTriggerByTouch: boolean = false) => {
  if (isAnimating.value) return
  
  // 清除自动轮播计时器
  clearAutoPlayTimer()
  
  isAnimating.value = true
  
  // 重置拖拽偏移
  dragOffset.value = 0
  
  bufferTransform.value = 100 // 向下移动动画效果
  
  setTimeout(() => {
    // 直接设置到第一个
    tiktokStore.currentIndex = 0
    updateBuffer()
    bufferTransform.value = 0
    
    setTimeout(() => {
      isAnimating.value = false
    }, getAnimationDelay(isTriggerByTouch))
  }, 200) // 动画一半时间后更新内容
}

// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  if (isAnimating.value) return
  
  // 清除自动轮播计时器
  clearAutoPlayTimer()
  
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isDragging.value = true
  dragOffset.value = 0
  
  // 确保 transform 状态正确
  if (bufferTransform.value !== 0) {
    bufferTransform.value = 0
  }
}
 
const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || isAnimating.value) return
  
  touchCurrentY.value = e.touches[0].clientY
  const deltaY = touchCurrentY.value - touchStartY.value
  const maxDrag = window.innerHeight * 0.5 // 最大拖拽距离为屏幕高度的50%
  
  // 限制拖拽范围并添加阻尼效果
  dragOffset.value = Math.max(-maxDrag, Math.min(maxDrag, deltaY * 0.5))
  
  // 阻止页面滚动
  e.preventDefault()
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  
  const deltaY = touchCurrentY.value - touchStartY.value
  const threshold = 80 // 滑动阈值
  
  // 重置拖拽状态
  isDragging.value = false
  
  if (isAnimating.value) {
    // 如果正在动画中，强制重置到正确位置
    dragOffset.value = 0
    return
  }
  
  if (Math.abs(deltaY) > threshold) {
    if (deltaY > 0 && tiktokStore.hasPrev) {
      // 向下滑动，上一个
      goToPrev(true)
    } else if (deltaY < 0 && tiktokStore.hasNext) {
      // 向上滑动，下一个
      goToNext(true)
    } else {
      // 回弹动画 - 添加过渡效果
      resetToCenter()
    }
  } else {
    // 回弹动画 - 添加过渡效果
    resetToCenter()
  }
}

// 添加触摸取消处理
const handleTouchCancel = () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  if (!isAnimating.value) {
    resetToCenter()
  }
}

// 重置到中心位置的函数
const resetToCenter = () => {
  if (isAnimating.value) return
  
  isAnimating.value = true
  dragOffset.value = 0
  
  // 确保 bufferTransform 也是正确的
  bufferTransform.value = 0
  
  setTimeout(() => {
    isAnimating.value = false
    // 重新启动自动轮播计时器
    startAutoPlayTimer()
  }, 300) // 与 CSS 过渡时间一致
}

// // 错位检测和修复函数
// const fixMisalignment = () => {
//   if (isDragging.value) return
  
//   // 检测是否存在错位
//   if (bufferTransform.value !== 0 || dragOffset.value !== 0) {
//     // 强制重置到正确位置
//     bufferTransform.value = 0
//     dragOffset.value = 0
    
//     // 重新更新 buffer 确保内容正确
//     updateBuffer()
//   }
  
//   // 检查动画状态是否卡住
//   if (isAnimating.value) {
//     isAnimating.value = false
//   }
// }

// 鼠标滚轮事件
const handleWheel = throttle((e: WheelEvent) => {
  if (isAnimating.value) return 
  
  e.preventDefault()
  
  // 清除自动轮播计时器
  clearAutoPlayTimer()
  
  if (e.deltaY > 0 && tiktokStore.hasNext) {
    goToNext()
  } else if (e.deltaY < 0 && tiktokStore.hasPrev) {
    goToPrev()
  }
}, 500)


// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  // 仅在 TikTok 视图打开时生效
  if (!tiktokStore.visible || isAnimating.value) return
  
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      if (tiktokStore.hasPrev) goToPrev()
      break
    case 'ArrowDown':
      e.preventDefault()
      if (tiktokStore.hasNext) goToNext()
      break
    case 'Escape':
      e.preventDefault()
      tiktokStore.closeView()
      break
    // case 'F11':
    //   e.preventDefault()
    //   handleFullscreenToggle()
    //   break
    // case 'l':
    // case 'L':
    //   e.preventDefault()
    //   if (likeTag.value) toggleLike()
    //   break
    // case 'a':
    // case 'A':
    //   e.preventDefault()
    //   toggleAutoPlay()
    //   break
  }
}

// 全屏切换处理
const handleFullscreenToggle = async () => {
  if (tiktokStore.isFullscreen) {
    await exitFullscreen()
  } else {
    await requestFullscreen()
  }
}

// 请求全屏
const requestFullscreen = async () => {
  if (containerRef.value && !document.fullscreenElement) {
    try {
      await containerRef.value.requestFullscreen()
      tiktokStore.isFullscreen = true
    } catch (err) {
      console.warn('无法进入全屏模式:', err)
    }
  }
}

// 退出全屏
const exitFullscreen = async () => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
      tiktokStore.isFullscreen = false
    } catch (err) {
      console.warn('无法退出全屏模式:', err)
    }
  }
}

// 切换声音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  
  // 立即应用到当前播放的视频
  const currentVideo = videoRefs.value[1]
  if (currentVideo) {
    currentVideo.muted = isMuted.value
  }
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  tiktokStore.isFullscreen = !!document.fullscreenElement
}
const videoPreloadList = ref([] as HTMLVideoElement[])
const recVideo = (video?: HTMLVideoElement) => {
  if (!video) return
  video.src = ''
  video.pause()
  video.muted = true
  if (video.parentNode) {
    video.parentNode.removeChild(video)
  }
}
watch(videoPreloadList, (newList) => {
  // 清理已加载的视频元素
  while (newList.length > 5) {
    const video = newList.shift()
    if (!video) continue
    recVideo(video)
  }
}, { deep: true })
watch(() => tiktokStore.visible ===false || tiktokStore.mediaList.length === 0, (isClose) => {
  if (isClose)  return
  // 组件隐藏时清理预加载列表
  videoPreloadList.value.forEach(recVideo)
  videoPreloadList.value = []
  
  autoPlayMode.value = 'off' // 重置自动轮播模式
}, { immediate: true })
// 预加载相邻媒体
const preloadMedia = () => {
  bufferItems.value.forEach(item => {
    if (!item) return
    
    if (isVideoFile(item.url)) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = item.url
      videoPreloadList.value.push(video)
    } else {
      const img = new Image()
      img.src = item.url
    }
  })
}


// 加载当前项的标签
const loadCurrentItemTags = async () => {
  const currentItem = tiktokStore.currentItem
  if (!currentItem) return
  
  const fullpath = (currentItem as any)?.fullpath || currentItem.id
  if (fullpath) {
    await tagStore.fetchImageTags([fullpath])
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  updateBuffer()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  
  // 清理自动轮播计时器
  clearAutoPlayTimer()
  
  // 清理：停止所有视频播放
  videoRefs.value.forEach(video => {
    recVideo(video!)
  })
})

// 监听当前项变化
watch(() => tiktokStore.currentIndex, () => {
  updateBuffer()
  nextTick(() => {
    preloadMedia()
    loadCurrentItemTags()
  })
}, { immediate: true })

// 监听媒体列表变化
watch(() => tiktokStore.mediaList, () => {
  updateBuffer()
}, { deep: true })

// 监听组件可见性变化
watch(() => tiktokStore.visible, (visible) => {
  if (!visible) {
    // 组件隐藏时停止所有视频
    videoRefs.value.forEach(video => {
      if (video) {
        video.pause()
      }
    })
    
    // 清除自动轮播计时器
    clearAutoPlayTimer()
    
    // 如果当前是全屏状态，退出全屏
    if (document.fullscreenElement) {
      exitFullscreen()
    }
  } else {
    // 组件显示时重新控制视频播放
    nextTick(() => {
      controlVideoPlayback()
    })
  }
})

// 监听静音状态变化，同步所有视频
watch(() => isMuted.value, (muted) => {
  videoRefs.value.forEach(video => {
    if (video) {
      video.muted = muted
    }
  })
})

// 监听自动轮播模式变化
watch(() => autoPlayMode.value, () => {
  startAutoPlayTimer()
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="tiktokStore.visible" 
      ref="containerRef"
      :class="containerClass"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchCancel"
      @wheel="handleWheel"
    >
      <!-- 媒体内容区域 -->
      <div ref="viewportRef" class="tiktok-viewport">
        <!-- 3位buffer渲染 -->


        
        <div 
          v-for="(item, index) in bufferItems" 
          :key="item?.id || `empty-${index}`"
          class="tiktok-media-item"
          :style="getItemStyle(index)"
        >
          <div v-if="item" class="media-content">
            <!-- 视频 -->
            <video
              v-if="isVideoFile(item.url) && tiktokStore.visible"
              class="tiktok-media"
              :src="item.url"
              :controls="index === 1" 
              :loop="index === 1 && autoPlayMode === 'off'"
              playsinline
              preload="metadata"
              :key="item.url"
              :ref="(el) => { if (el) videoRefs[index] = el as HTMLVideoElement }"
            />
            
            <!-- 图片 -->
            <img
              v-else
              class="tiktok-media"
              :src="item.url"
            />
          </div>
        </div>
      </div>

      <!-- 控制按钮区域 -->
      <div class="tiktok-controls">
        <!-- 关闭按钮 -->
        <button 
          class="control-btn close-btn"
          @click="tiktokStore.closeView"
          :title="$t('close')"
        >
          <CloseOutlined />
        </button>

        <!-- 全屏切换按钮 -->
        <button 
          class="control-btn fullscreen-btn"
          @click="handleFullscreenToggle"
          :title="tiktokStore.isFullscreen ? $t('exitFullscreen') : $t('fullscreen')"
        >
          <FullscreenExitOutlined v-if="tiktokStore.isFullscreen" />
          <FullscreenOutlined v-else />
        </button>

        <!-- 声音切换按钮 -->
        <button 
          class="control-btn sound-btn"
          @click="toggleMute"
          :title="isMuted ? $t('soundOn') : $t('soundOff')"
        >
          <SoundFilled v-if="!isMuted" />
          <SoundOutlined v-else />
        </button>

        <!-- Like 按钮 -->
        <button 
          v-if="likeTag"
          class="control-btn like-btn"
          :class="{ 'like-active': isLiked }"
          @click="toggleLike"
          :title="isLiked ? $t('unlike') : $t('like')"
        >
          <HeartFilled v-if="isLiked" />
          <HeartOutlined v-else />
        </button>

        <!-- 自动轮播按钮 -->
        <button 
          class="control-btn autoplay-btn"
          :class="{ 'autoplay-active': autoPlayMode !== 'off' }"
          @click="toggleAutoPlay"
          :title="$t('autoPlayTooltip', { mode: autoPlayLabels[autoPlayMode] })"
        >
          <PlayCircleOutlined />
          <span class="autoplay-label">{{ autoPlayLabels[autoPlayMode] }}</span>
        </button>

        <!-- TAG 按钮 -->
        <button 
          class="control-btn tags-btn"
          @click="showTags = !showTags"
          :title="$t('tags')"
        >
          <TagsOutlined />
        </button>
      </div>

      <!-- 导航指示器 -->
      <div class="tiktok-navigation">
        <!-- 上一个指示器 -->
        <div 
          v-if="tiktokStore.hasPrev"
          class="nav-indicator nav-prev"
          @touchstart.prevent="goToPrev(false)"
          @click="goToPrev(false)"
        >
          <UpOutlined />
        </div>

        <!-- 下一个指示器 -->
        <div 
          v-if="tiktokStore.hasNext"
          class="nav-indicator nav-next"
          @touchstart.prevent="goToNext(false)"
          @click="goToNext(false)"
        >
          <DownOutlined />
        </div>
      </div>

      <!-- 进度指示器 -->
      <div class="tiktok-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ 
              width: `${((tiktokStore.currentIndex + 1) / tiktokStore.mediaList.length) * 100}%` 
            }"
          />
        </div>
        <span class="progress-text">
          {{ tiktokStore.currentIndex + 1 }} / {{ tiktokStore.mediaList.length }}
        </span>
      </div>

      <!-- TAG 面板 -->
      <Transition name="slide-up">
        <div v-if="showTags" class="tiktok-tags-panel">
          <div class="tags-header">
            <h3>{{ $t('tags') }}</h3>
            <button @click="showTags = false" class="close-tags">
              <CloseOutlined />
            </button>
          </div>
          
          <div class="tags-content">
            <!-- 添加新标签 -->
            <div 
              @click="openAddNewTagModal" 
              :style="{
                background: 'var(--zp-primary-background)', 
                color: 'var(--zp-luminous)',
                border: '2px solid var(--zp-luminous)',
                ...tagBaseStyle
              }"
            >
              {{ $t('addNewCustomTag') }}
            </div>

            <!-- 现有标签 -->
            <div
              v-for="tag in global.conf?.all_custom_tags || []"
              :key="tag.id"
              @click="onTagClick(tag.id)"
              :style="{
                background: isTagSelected(tag.id) ? tagStore.getColor(tag) : 'var(--zp-primary-background)', 
                color: !isTagSelected(tag.id) ? tagStore.getColor(tag) : 'white', 
                border: `2px solid ${tagStore.getColor(tag)}`,
                ...tagBaseStyle
              }"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.tiktok-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;

  &--floating {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
  }

  &--mobile {
    .tiktok-controls {
      bottom: 20px;
      right: 20px;
    }
  }
}

.tiktok-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.tiktok-media-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

.media-content {
  width: 100%;
  height: calc(100% - 32px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tiktok-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0;
}

.tiktok-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.control-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
  
  &.like-btn {
    &.like-active {
      background: rgba(255, 20, 147, 0.3); // 深粉色背景
      color: #ff1493; // 深粉色
      
      &:hover {
        background: rgba(255, 20, 147, 0.5);
        transform: scale(1.15); // 稍微大一点的缩放效果
      }
    }
    
    &:not(.like-active):hover {
      color: #ff69b4; // 浅粉色
    }
  }
  
  &.autoplay-btn {
    width: 48px;
    height: 48px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    
    .autoplay-label {
      position: absolute;
      bottom: -2px;
      right: -2px;
      font-size: 10px;
      font-weight: bold;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 2px 4px;
      border-radius: 8px;
      line-height: 1;
      min-width: 20px;
      text-align: center;
      backdrop-filter: blur(5px);
    }
    
    &.autoplay-active {
      background: rgba(76, 175, 80, 0.3); // 绿色背景
      color: #4caf50; // 绿色
      
      .autoplay-label {
        background: rgba(76, 175, 80, 0.9);
        color: white;
      }
      
      &:hover {
        background: rgba(76, 175, 80, 0.5);
        transform: scale(1.1);
      }
    }
    
    &:not(.autoplay-active):hover {
      color: #81c784; // 浅绿色
    }
  }
}

.tiktok-navigation {
  position: absolute;
  right: 90px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
}

.nav-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  z-index: 999;

  &:hover {
    background: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }
  
  &.nav-fix {
    background: rgba(255, 165, 0, 0.3); // 橙色背景以区分
    
    &:hover {
      background: rgba(255, 165, 0, 0.5);
    }
  }
}

.tiktok-progress {
  position: absolute;
  bottom: 5px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
  pointer-events: none;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  transition: width 0.3s ease;
}

.progress-text {
  color: white;
  font-size: 14px;
  min-width: 60px;
  text-align: right;
}

.tiktok-tags-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px 20px 0 0;
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
  z-index: 20;
}

.tags-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: white;

  h3 {
    margin: 0;
    font-size: 18px;
  }

  .close-tags {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
  }
}

.tags-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

// 动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

// 移动端适配
@media (max-width: 768px) {
  .tiktok-controls {
    top: 40px;
    right: 15px;
    gap: 10px;
  }

  .control-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
    
    &.autoplay-btn {
      width: 44px;
      height: 44px;
      
      .autoplay-label {
        font-size: 8px;
        padding: 1px 3px;
        border-radius: 6px;
        min-width: 16px;
      }
    }
  }

  .tiktok-navigation {
    right: 80px;
  }

  .nav-indicator {
    width: 36px;
    height: 36px;
  }

  .tiktok-progress {
    bottom: 80px;
    left: 15px;
    right: 15px;
  }

  .tiktok-tags-panel {
    padding: 15px;
    max-height: 50vh;
  }
}
</style> 