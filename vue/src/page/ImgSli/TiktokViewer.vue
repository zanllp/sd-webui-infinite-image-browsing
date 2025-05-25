<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useTiktokStore, type TiktokMediaItem } from '@/store/useTiktokStore'
import { useTagStore } from '@/store/useTagStore'
import { useGlobalStore } from '@/store/useGlobalStore'
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
  TagsOutlined
} from '@/icon'
import { t } from '@/i18n'
import type { StyleValue } from 'vue'
import { throttle } from 'lodash-es'
import { delay } from 'vue3-ts-util'

const tiktokStore = useTiktokStore()
const tagStore = useTagStore()
const global = useGlobalStore()

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
        video.muted = true // 确保静音以避免自动播放策略限制
        await video.play()
      } else {
        // 非当前显示的视频：暂停并重置
        video.pause()
        video.currentTime = 0
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
  })
}

// TAG 相关功能
const isTagSelected = (tagId: string | number) => {
  const currentUrl = currentItem.value?.url
  if (!currentUrl) return false
  
  const fullpath = (currentItem.value as any)?.fullpath || currentItem.value?.id
  return !!tagStore.tagMap.get(fullpath)?.some(v => v.id === tagId)
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
    
    const tag = global.conf?.all_custom_tags.find((v) => v.id === tagId)?.name || '标签'
    await tagStore.refreshTags([fullpath])
    
    message.success(t(is_remove ? 'removedTagFromImage' : 'addedTagToImage', { tag }))
  } catch (error) {
    console.error('Toggle tag error:', error)
    message.error('标签操作失败')
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

// 滑动到上一个
const goToPrev = (isTriggerByTouch: boolean = false) => {
  if (isAnimating.value || !tiktokStore.hasPrev) return
  
  isAnimating.value = true
  bufferTransform.value = 100 // 向下移动
  
  setTimeout(() => {
    tiktokStore.prev()
    updateBuffer()
    bufferTransform.value = 0
    setTimeout(() => {
      isAnimating.value = false
    }, getAnimationDelay(isTriggerByTouch)) // Mac需要更长延迟避免触摸板惯性滚动
  }, 200) // 动画一半时间后更新内容
}

// 滑动到下一个
const goToNext = (isTriggerByTouch: boolean = false) => {
  if (isAnimating.value || !tiktokStore.hasNext) return
  
  isAnimating.value = true
  bufferTransform.value = -100 // 向上移动
  
  setTimeout(() => {
    tiktokStore.next()
    updateBuffer()
    bufferTransform.value = 0
    setTimeout(() => {
      isAnimating.value = false
    }, getAnimationDelay(isTriggerByTouch)) // Mac需要更长延迟避免触摸板惯性滚动
  }, 200) // 动画一半时间后更新内容
}


// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  if (isAnimating.value) return
  
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isDragging.value = true
  dragOffset.value = 0
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
  if (!isDragging.value || isAnimating.value) return
  
  isDragging.value = false
  const deltaY = touchCurrentY.value - touchStartY.value
  const threshold = 80 // 滑动阈值
  
  if (Math.abs(deltaY) > threshold) {
    if (deltaY > 0 && tiktokStore.hasPrev) {
      // 向下滑动，上一个
      goToPrev()
    } else if (deltaY < 0 && tiktokStore.hasNext) {
      // 向上滑动，下一个
      goToNext()
    } else {
      // 回弹动画
      dragOffset.value = 0
    }
  } else {
    // 回弹动画
    dragOffset.value = 0
  }
}

// 鼠标滚轮事件
const handleWheel = throttle((e: WheelEvent) => {
  if (isAnimating.value) return 
  
  e.preventDefault()
  
  if (e.deltaY > 0 && tiktokStore.hasNext) {
    goToNext()
  } else if (e.deltaY < 0 && tiktokStore.hasPrev) {
    goToPrev()
  }
}, 500)


// 键盘事件
const handleKeydown = (e: KeyboardEvent) => {
  if (isAnimating.value) return
  
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
    case 'F11':
      e.preventDefault()
      handleFullscreenToggle()
      break
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

// 监听全屏状态变化
const handleFullscreenChange = () => {
  tiktokStore.isFullscreen = !!document.fullscreenElement
}

// 预加载相邻媒体
const preloadMedia = () => {
  bufferItems.value.forEach(item => {
    if (!item) return
    
    if (isVideoFile(item.url)) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = item.url
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
  
  // 清理：停止所有视频播放
  videoRefs.value.forEach(video => {
    if (video) {
      video.pause()
    }
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
              v-if="isVideoFile(item.url)"
              class="tiktok-media"
              :src="item.url"
              :controls="index === 1" 
              muted
              :loop="index === 1"
              playsinline
              preload="metadata"
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
          @click="goToPrev(false)"
        >
          <UpOutlined />
        </div>

        <!-- 下一个指示器 -->
        <div 
          v-if="tiktokStore.hasNext"
          class="nav-indicator nav-next"
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
  height: 100%;
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
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.tiktok-navigation {
  position: absolute;
  right: 20px;
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

  &:hover {
    background: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }
}

.tiktok-progress {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;
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
  }

  .tiktok-navigation {
    right: 15px;
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