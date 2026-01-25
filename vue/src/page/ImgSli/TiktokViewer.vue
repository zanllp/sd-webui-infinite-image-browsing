<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useTiktokStore, type TiktokMediaItem } from '@/store/useTiktokStore'
import { useTagStore } from '@/store/useTagStore'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useLocalStorage, onLongPress } from '@vueuse/core'
import { copy2clipboardI18n, isVideoFile, isAudioFile } from '@/util'
import { openAddNewTagModal } from '@/components/functionalCallableComp'
import { toggleCustomTagToImg } from '@/api/db'
import { deleteFiles } from '@/api/files'
import { getImageGenerationInfo, openFolder, openWithDefaultApp } from '@/api'
import { toRawFileUrl } from '@/util/file'
import { parse } from '@/util/stable-diffusion-image-metadata'
import { message, Modal } from 'ant-design-vue'
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
  PlayCircleOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  CopyOutlined,
  LinkOutlined,
  FileTextOutlined,
  InfoCircleOutlined
} from '@/icon'
import { t } from '@/i18n'
import type { StyleValue } from 'vue'
import { throttle } from 'lodash-es'
import { delay } from 'vue3-ts-util'

const isDev = import.meta.env.DEV

const tiktokStore = useTiktokStore()
const tagStore = useTagStore()
const globalStore = useGlobalStore()
const global = useGlobalStore()

// 调试信息计算属性
const debugInfo = computed(() => ({
  isAnimating: isAnimating.value,
  isDragging: isDragging.value,
  bufferTransform: bufferTransform.value,
  dragOffset: dragOffset.value,
  autoPlayMode: autoPlayMode.value,
  isMuted: isMuted.value,
  currentIndex: tiktokStore.currentIndex,
}))

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
const audioRefs = ref<(HTMLAudioElement | null)[]>([null, null, null]) // 音频元素引用

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
const imageGenInfo = ref('')
const promptLoading = ref(false)
let promptRequestId = 0

// 控件可见性状态（长按切换）
const controlsVisible = ref(true)

// 长按切换控件可见性
const toggleControlsVisibility = () => {
  controlsVisible.value = !controlsVisible.value
}

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

// 处理音频播放结束事件
const handleAudioEnded = (index: number) => {
  // 只处理当前显示的音频（index === 1）
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
  // 控制视频
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
  
  // 控制音频
  for (let index = 0; index < audioRefs.value.length; index++) {
    const audio = audioRefs.value[index]
    if (!audio) continue

    try {
      if (index === 1) {
        // 当前显示的音频：自动播放
        audio.currentTime = 0 // 重置到开头
        audio.muted = isMuted.value // 根据用户偏好设置静音状态

        // 添加音频结束事件监听
        audio.onended = () => handleAudioEnded(index)

        await audio.play()
      } else {
        // 非当前显示的音频：暂停并重置
        audio.pause()
        audio.currentTime = 0
        audio.onended = null // 清除事件监听
      }
    } catch (err) {
      console.warn(`音频播放控制失败 (index: ${index}):`, err)
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

const cleanImageGenInfo = computed(() => imageGenInfo.value.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;'))
const geninfoStruct = computed(() => parse(cleanImageGenInfo.value))

function getTextLength (text: string): number {
  let length = 0
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      length += 3
    } else {
      length += 1
    }
  }
  return length
}

function isTagStylePrompt (tags: string[]): boolean {
  if (tags.length === 0) return false

  let totalLength = 0
  for (const tag of tags) {
    const tagLength = getTextLength(tag)
    totalLength += tagLength

    if (tagLength > 50) {
      return false
    }
  }

  const avgLength = totalLength / tags.length
  if (avgLength > 30) {
    return false
  }

  return true
}

function spanWrap (text: string) {
  if (!text) {
    return ''
  }

  const specBreakTag = 'BREAK'
  const values = text.replace(/&gt;\s/g, '> ,').replace(/\sBREAK\s/g, ',' + specBreakTag + ',')
    .split(/[\n,]+/)
    .map(v => v.trim())
    .filter(v => v)

  if (!isTagStylePrompt(values)) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => `<p class="natural-text">${line}</p>`)
      .join('')
  }

  const frags = [] as string[]
  let parenthesisActive = false
  for (let i = 0; i < values.length; i++) {
    if (values[i] === specBreakTag) {
      frags.push('<br><span class="tag" style="color:var(--zp-secondary)">BREAK</span><br>')
      continue
    }
    const trimmedValue = values[i]
    if (!parenthesisActive) parenthesisActive = trimmedValue.includes('(')
    const classList = ['tag']
    if (parenthesisActive) classList.push('has-parentheses')
    if (trimmedValue.length < 32) classList.push('short-tag')
    frags.push(`<span class="${classList.join(' ')}">${trimmedValue}</span>`)
    if (parenthesisActive) parenthesisActive = !trimmedValue.includes(')')
  }
  return frags.join(global.showCommaInInfoPanel ? ',' : ' ')
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
  if (isAnimating.value) {
    e.preventDefault()
    return
  }

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
  if (isAnimating.value) {
    e.preventDefault()
    return
  }

  if (!isDragging.value) return

  touchCurrentY.value = e.touches[0].clientY
  const deltaY = touchCurrentY.value - touchStartY.value
  const viewportHeight = window.innerHeight

  // 直接将移动距离转换为容器的百分比，完全线性映射
  const movePercent = (deltaY / viewportHeight) * 100

  // 简单的线性移动，不使用阻尼
  dragOffset.value = movePercent

  // 阻止页面滚动
  e.preventDefault()
}

const handleTouchEnd = () => {
  if (!isDragging.value) return

  const deltaY = touchCurrentY.value - touchStartY.value
  const viewportHeight = window.innerHeight
  const movePercent = (deltaY / viewportHeight) * 100

  // 重置拖拽状态
  isDragging.value = false

  if (isAnimating.value) {
    // 如果正在动画中，强制重置到正确位置
    dragOffset.value = 0
    return
  }

  // 增加阈值到容器高度的30%
  if (Math.abs(movePercent) > 30) {
    if (movePercent > 0 && tiktokStore.hasPrev) {
      // 向下滑动，上一个
      goToPrev(true)
    } else if (movePercent < 0 && tiktokStore.hasNext) {
      // 向上滑动，下一个
      goToNext(true)
    } else {
      // 回弹动画
      resetToCenter()
    }
  } else {
    // 回弹动画
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
  
  // 立即应用到当前播放的音频
  const currentAudio = audioRefs.value[1]
  if (currentAudio) {
    currentAudio.muted = isMuted.value
  }
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  tiktokStore.isFullscreen = !!document.fullscreenElement
}
const videoPreloadList = ref([] as HTMLVideoElement[])
const audioPreloadList = ref([] as HTMLAudioElement[])

const recVideo = (video?: HTMLVideoElement) => {
  if (!video) return
  video.pause()
  video.src = ''
  video.muted = true
  video.load() // 强制释放资源
  if (video.parentNode) {
    video.parentNode.removeChild(video)
  }
}

const recAudio = (audio?: HTMLAudioElement) => {
  if (!audio) return
  audio.pause()
  audio.src = ''
  audio.muted = true
  audio.load() // 强制释放资源
  if (audio.parentNode) {
    audio.parentNode.removeChild(audio)
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

watch(audioPreloadList, (newList) => {
  // 清理已加载的音频元素
  while (newList.length > 5) {
    const audio = newList.shift()
    if (!audio) continue
    recAudio(audio)
  }
}, { deep: true })
watch(() => tiktokStore.visible === false || tiktokStore.mediaList.length === 0, (isClose) => {
  if (isClose) return
  // 组件隐藏时清理预加载列表
  videoPreloadList.value.forEach(recVideo)
  videoPreloadList.value = []
  audioPreloadList.value.forEach(recAudio)
  audioPreloadList.value = []

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
    } else if (isAudioFile(item.url)) {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = item.url
      audioPreloadList.value.push(audio)
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

const loadCurrentItemPrompt = async () => {
  const currentItem = tiktokStore.currentItem
  if (!currentItem) {
    imageGenInfo.value = ''
    return
  }
  const nameOrUrl = currentItem.name || currentItem.url
  if (isVideoFile(nameOrUrl) || isAudioFile(nameOrUrl)) {
    imageGenInfo.value = ''
    return
  }
  const fullpath = (currentItem as any)?.fullpath || currentItem.id
  if (!fullpath) {
    imageGenInfo.value = ''
    return
  }

  const requestId = ++promptRequestId
  promptLoading.value = true
  try {
    const info = await getImageGenerationInfo(fullpath)
    if (requestId !== promptRequestId) return
    imageGenInfo.value = info
  } catch (error) {
    console.error('Load prompt error:', error)
    if (requestId !== promptRequestId) return
    imageGenInfo.value = ''
  } finally {
    if (requestId === promptRequestId) {
      promptLoading.value = false
    }
  }
}

const getCurrentFullpath = () => {
  return (currentItem.value as any)?.fullpath || currentItem.value?.id || ''
}

const getCurrentDisplayName = () => {
  return currentItem.value?.name || getCurrentFullpath().split(/[/\\]/).pop() || ''
}

const removeCurrentItemFromList = () => {
  const idx = tiktokStore.currentIndex
  if (idx < 0 || idx >= tiktokStore.mediaList.length) return
  tiktokStore.mediaList.splice(idx, 1)
  if (tiktokStore.mediaList.length === 0) {
    tiktokStore.closeView()
    return
  }
  if (idx >= tiktokStore.mediaList.length) {
    tiktokStore.currentIndex = tiktokStore.mediaList.length - 1
  }
}

const handleDeleteCurrent = async () => {
  const fullpath = getCurrentFullpath()
  if (!fullpath) return
  await new Promise<void>((resolve) => {
    Modal.confirm({
      title: t('confirmDelete'),
      maskClosable: true,
      content: getCurrentDisplayName(),
      async onOk () {
        await deleteFiles([fullpath])
        message.success(t('deleteSuccess'))
        removeCurrentItemFromList()
        showTags.value = false
        resolve()
      },
      onCancel () {
        resolve()
      }
    })
  })
}

const handleOpenFolder = async () => {
  const fullpath = getCurrentFullpath()
  if (!fullpath) return
  await openFolder(fullpath)
}

const handleOpenWithDefaultApp = async () => {
  const fullpath = getCurrentFullpath()
  if (!fullpath) return
  await openWithDefaultApp(fullpath)
}

const handleCopyPath = () => {
  const fullpath = getCurrentFullpath()
  if (!fullpath) return
  copy2clipboardI18n(fullpath)
}

const handleCopyPreviewUrl = () => {
  const file = (currentItem.value as any)?.originalFile
  const url = file ? toRawFileUrl(file) : currentItem.value?.url
  if (!url) return
  copy2clipboardI18n(url)
}

// 长按切换控件可见性
onLongPress(
  viewportRef,
  toggleControlsVisibility,
  { delay: 500 }
)

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
  
  // 清理：停止所有音频播放
  audioRefs.value.forEach(audio => {
    recAudio(audio!)
  })
  
  // 清理预加载列表
  videoPreloadList.value.forEach(recVideo)
  videoPreloadList.value = []
  audioPreloadList.value.forEach(recAudio)
  audioPreloadList.value = []
})

// 监听当前项变化
watch(() => tiktokStore.currentIndex, () => {
  showTags.value = false
  updateBuffer()
  nextTick(() => {
    preloadMedia()
    loadCurrentItemTags()
    loadCurrentItemPrompt()
  })
}, { immediate: true })

// 监听媒体列表变化
watch(() => tiktokStore.mediaList, () => {
  updateBuffer()
  nextTick(() => {
    loadCurrentItemTags()
    loadCurrentItemPrompt()
  })
}, { deep: true })

// 监听组件可见性变化
watch(() => tiktokStore.visible, (visible) => {
  if (!visible) {
    showTags.value = false
    imageGenInfo.value = ''
    promptLoading.value = false
    promptRequestId++
    // 组件隐藏时停止并清理所有视频
    videoRefs.value.forEach(video => {
      if (video) {
        video.pause()
        video.src = ''
        video.load()
      }
    })
    videoRefs.value = [null, null, null]
    
    // 组件隐藏时停止并清理所有音频
    audioRefs.value.forEach(audio => {
      if (audio) {
        audio.pause()
        audio.src = ''
        audio.load()
      }
    })
    audioRefs.value = [null, null, null]
    
    // 清空缓冲区
    bufferItems.value = [null, null, null]

    // 清除自动轮播计时器
    clearAutoPlayTimer()

    // 如果当前是全屏状态，退出全屏
    if (document.fullscreenElement) {
      exitFullscreen()
    }
  } else {
    // 组件显示时重置控件可见性
    controlsVisible.value = true
    
    // 组件显示时重新更新缓冲区并控制播放
    nextTick(() => {
      updateBuffer()
    })
  }
})

// 监听静音状态变化，同步所有视频和音频
watch(() => isMuted.value, (muted) => {
  videoRefs.value.forEach(video => {
    if (video) {
      video.muted = muted
    }
  })
  audioRefs.value.forEach(audio => {
    if (audio) {
      audio.muted = muted
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
    <div v-if="tiktokStore.visible" ref="containerRef" :class="containerClass" @touchstart="handleTouchStart"
      @touchmove="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="handleTouchCancel" @wheel="handleWheel">
      <!-- Debug信息 -->
      <div v-if="isDev" class="debug-info">
        <div v-for="(value, key) in debugInfo" :key="key" class="debug-item">
          <span class="debug-label">{{ key }}:</span>
          <span class="debug-value" :class="{ 'is-true': value === true, 'is-false': value === false }">
            {{ value }}
          </span>
        </div>
      </div>

      <!-- 媒体内容区域 -->
      <div ref="viewportRef" class="tiktok-viewport">
        <!-- 3位buffer渲染 -->



        <div v-for="(item, index) in bufferItems" :key="item?.id || `empty-${index}`" class="tiktok-media-item"
          :style="getItemStyle(index)">
          <div v-if="item" class="media-content">
            <!-- 视频 -->
            <video v-if="isVideoFile(item.url) && tiktokStore.visible" class="tiktok-media tiktok-video" :src="item.url"
              :controls="index === 1" :loop="index === 1 && autoPlayMode === 'off'" playsinline preload="metadata"
              :key="item.url" :ref="(el) => { if (el) videoRefs[index] = el as HTMLVideoElement }" />

            <!-- 音频 -->
            <div v-else-if="isAudioFile(item.url) && tiktokStore.visible" class="tiktok-media tiktok-audio-container">
              <div class="audio-icon">🎵</div>
              <div class="audio-filename">{{ item.name || item.url.split('/').pop() }}</div>
              <audio 
                class="tiktok-audio"
                :src="item.url"
                :controls="index === 1"
                :loop="index === 1 && autoPlayMode === 'off'"
                preload="metadata"
                :key="item.url"
                :ref="(el) => { if (el) audioRefs[index] = el as HTMLAudioElement }"
              />
            </div>

            <!-- 图片 -->
            <img v-else class="tiktok-media" :src="item.url" />
          </div>
        </div>
      </div>

      <!-- 控制按钮区域 -->
      <div v-show="controlsVisible" class="tiktok-controls">
        <!-- 关闭按钮 -->
        <button class="control-btn close-btn" @click="tiktokStore.closeView" :title="$t('close')">
          <CloseOutlined />
        </button>

        <!-- 全屏切换按钮 -->
        <button class="control-btn fullscreen-btn" @click="handleFullscreenToggle"
          :title="tiktokStore.isFullscreen ? $t('exitFullscreen') : $t('fullscreen')">
          <FullscreenExitOutlined v-if="tiktokStore.isFullscreen" />
          <FullscreenOutlined v-else />
        </button>

        <!-- 声音切换按钮 -->
        <button class="control-btn sound-btn" @click="toggleMute" :title="isMuted ? $t('soundOn') : $t('soundOff')">
          <SoundFilled v-if="!isMuted" />
          <SoundOutlined v-else />
        </button>

        <!-- Like 按钮 -->
        <button v-if="likeTag" class="control-btn like-btn" :class="{ 'like-active': isLiked }" @click="toggleLike"
          :title="isLiked ? $t('unlike') : $t('like')">
          <HeartFilled v-if="isLiked" />
          <HeartOutlined v-else />
        </button>

        <!-- 自动轮播按钮 -->
        <button class="control-btn autoplay-btn" :class="{ 'autoplay-active': autoPlayMode !== 'off' }"
          @click="toggleAutoPlay" :title="$t('autoPlayTooltip', { mode: autoPlayLabels[autoPlayMode] })">
          <PlayCircleOutlined />
          <span class="autoplay-label">{{ autoPlayLabels[autoPlayMode] }}</span>
        </button>

        <!-- 详情按钮 -->
        <button class="control-btn tags-btn" @click="showTags = !showTags" :title="$t('info')">
          <InfoCircleOutlined />
        </button>
      </div>

      <!-- 导航指示器 -->
      <div v-show="controlsVisible" v-if="globalStore.showTiktokNavigator" class="tiktok-navigation">
        <!-- 上一个指示器 -->
        <div v-if="tiktokStore.hasPrev" class="nav-indicator nav-prev" @touchstart.prevent="goToPrev(false)"
          @click="goToPrev(false)">
          <UpOutlined />
        </div>

        <!-- 下一个指示器 -->
        <div v-if="tiktokStore.hasNext" class="nav-indicator nav-next" @touchstart.prevent="goToNext(false)"
          @click="goToNext(false)">
          <DownOutlined />
        </div>
      </div>

      <!-- 底部渐变遮罩和文件名 -->
      <div v-show="controlsVisible" class="tiktok-bottom-overlay">
        <div class="filename-display" v-if="currentItem?.name">
          {{ currentItem.name }}
        </div>
      </div>

      <!-- 进度指示器 -->
      <div v-show="controlsVisible" class="tiktok-progress">
        <div class="progress-bar-row">
          <div class="progress-bar">
            <div class="progress-fill" :style="{
              width: `${((tiktokStore.currentIndex + 1) / tiktokStore.mediaList.length) * 100}%`
            }" />
          </div>
          <span class="progress-text">
            {{ tiktokStore.currentIndex + 1 }} / {{ tiktokStore.mediaList.length }}
          </span>
        </div>
      </div>

      <!-- 详情面板 -->
      <Transition name="slide-up">
        <div v-if="showTags" class="tiktok-tags-panel">
          <div class="panel-header">
            <div class="panel-title">
              <InfoCircleOutlined />
              <span>{{ $t('details') }}</span>
            </div>
            <button @click="showTags = false" class="close-tags">
              <CloseOutlined />
            </button>
          </div>

          <div class="panel-body" @wheel.stop @touchmove.stop>
            <div class="panel-section panel-actions">
              <button class="panel-action-btn danger" @click="handleDeleteCurrent" :title="$t('deleteSelected')">
                <DeleteOutlined />
              </button>
              <button class="panel-action-btn" @click="handleOpenFolder" :title="$t('openWithLocalFileBrowser')">
                <FolderOpenOutlined />
              </button>
              <button class="panel-action-btn" @click="handleOpenWithDefaultApp" :title="$t('openWithDefaultApp')">
                <AppstoreOutlined />
              </button>
              <button class="panel-action-btn" @click="handleCopyPath" :title="$t('copyFilePath')">
                <CopyOutlined />
              </button>
              <button class="panel-action-btn" @click="handleCopyPreviewUrl" :title="$t('copySourceFilePreviewLink')">
                <LinkOutlined />
              </button>
            </div>

            <div class="panel-section">
              <div class="section-title">
                <TagsOutlined /> <span>{{ $t('tags') }}</span>
              </div>
              <div class="tags-content">
                <!-- 添加新标签 -->
                <div @click="openAddNewTagModal" :style="{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--zp-luminous)',
                  border: '1px solid var(--zp-luminous)',
                  ...tagBaseStyle
                }">
                  {{ $t('addNewCustomTag') }}
                </div>

                <!-- 现有标签 -->
                <div v-for="tag in global.conf?.all_custom_tags || []" :key="tag.id" @click="onTagClick(tag.id)" :style="{
                  background: isTagSelected(tag.id) ? tagStore.getColor(tag) : 'rgba(255, 255, 255, 0.05)',
                  color: !isTagSelected(tag.id) ? tagStore.getColor(tag) : 'white',
                  border: `1px solid ${tagStore.getColor(tag)}`,
                  ...tagBaseStyle
                }">
                  {{ tag.name }}
                </div>
              </div>
            </div>

            <div class="panel-section prompt-section">
              <div class="section-title">
                <FileTextOutlined /> <span>Prompt</span>
              </div>
              <div class="prompt-content">
                <div v-if="promptLoading" class="prompt-empty">...</div>
                <template v-else>
                  <template v-if="geninfoStruct.prompt">
                    <div class="prompt-block">
                      <div class="prompt-label">Positive</div>
                      <code v-html="spanWrap(geninfoStruct.prompt ?? '')"></code>
                    </div>
                  </template>
                  <template v-if="geninfoStruct.negativePrompt">
                    <div class="prompt-block">
                      <div class="prompt-label">Negative</div>
                      <code v-html="spanWrap(geninfoStruct.negativePrompt ?? '')"></code>
                    </div>
                  </template>
                  <div v-if="!geninfoStruct.prompt && !geninfoStruct.negativePrompt" class="prompt-empty">—</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.debug-info {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 16px;
  color: #fff;
  z-index: 9999;
  pointer-events: none;
  backdrop-filter: blur(4px);

  .debug-item {
    margin: 4px 0;
    display: flex;
    gap: 8px;
  }

  .debug-label {
    color: #888;
  }

  .debug-value {
    &.is-true {
      color: #4caf50;
    }

    &.is-false {
      color: #f44336;
    }
  }
}

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
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tiktok-media {
  width: 100%;
  height: 100%;
  margin: auto;
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

/* 底部渐变遮罩 - 抖音风格 */
.tiktok-bottom-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 40%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
  z-index: 8;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 20px 20px 20px;
}

.filename-display {
  color: white;
  font-size: 16px;
  text-align: left;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.tiktok-progress {
  position: absolute;
  bottom: 5px;
  left: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  z-index: 10;
  pointer-events: none;
}

.progress-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* 音频容器样式 */
.tiktok-audio-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background: linear-gradient(135deg, #0a0a1a 0%, #0d1525 50%, #0a1628 100%);
  position: relative;
  overflow: hidden;
  
  /* 星空背景层 */
  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }
  
  /* 星星层1 - 小星星 */
  &::before {
    background-image: 
      radial-gradient(1px 1px at 20px 30px, white, transparent),
      radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
      radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
      radial-gradient(1px 1px at 90px 40px, white, transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
      radial-gradient(1px 1px at 160px 120px, white, transparent),
      radial-gradient(1.5px 1.5px at 200px 50px, rgba(255,255,255,0.9), transparent),
      radial-gradient(1px 1px at 220px 150px, rgba(255,255,255,0.5), transparent),
      radial-gradient(1.5px 1.5px at 280px 90px, white, transparent),
      radial-gradient(1px 1px at 320px 20px, rgba(255,255,255,0.8), transparent),
      radial-gradient(1px 1px at 350px 180px, rgba(255,255,255,0.6), transparent),
      radial-gradient(1.5px 1.5px at 400px 60px, white, transparent),
      radial-gradient(1px 1px at 450px 130px, rgba(255,255,255,0.7), transparent),
      radial-gradient(1px 1px at 500px 40px, rgba(255,255,255,0.9), transparent),
      radial-gradient(1.5px 1.5px at 80px 200px, white, transparent),
      radial-gradient(1px 1px at 180px 220px, rgba(255,255,255,0.6), transparent),
      radial-gradient(1px 1px at 300px 250px, rgba(255,255,255,0.8), transparent),
      radial-gradient(1.5px 1.5px at 420px 200px, white, transparent);
    background-repeat: repeat;
    background-size: 550px 300px;
    animation: starfield-move 60s linear infinite;
  }
  
  /* 星星层2 - 亮星星，不同速度 */
  &::after {
    background-image: 
      radial-gradient(2px 2px at 100px 50px, rgba(255,255,255,0.9), transparent),
      radial-gradient(2px 2px at 250px 120px, white, transparent),
      radial-gradient(2.5px 2.5px at 380px 80px, rgba(200,220,255,0.9), transparent),
      radial-gradient(2px 2px at 150px 180px, rgba(255,255,255,0.8), transparent),
      radial-gradient(2.5px 2.5px at 450px 150px, rgba(220,200,255,0.9), transparent),
      radial-gradient(2px 2px at 50px 250px, white, transparent),
      radial-gradient(2px 2px at 320px 220px, rgba(255,255,255,0.85), transparent);
    background-repeat: repeat;
    background-size: 600px 350px;
    animation: starfield-move 90s linear infinite reverse;
    opacity: 0.8;
  }
  
  .audio-icon {
    font-size: 120px;
    margin-bottom: 24px;
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    z-index: 1;
    text-shadow: 0 0 40px rgba(100, 150, 255, 0.5);
  }
  
  .audio-filename {
    color: white;
    font-size: 18px;
    margin-bottom: 32px;
    max-width: 80%;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: relative;
    z-index: 1;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }
  
  .tiktok-audio {
    width: 80%;
    max-width: 1400px;
    position: relative;
    z-index: 1;
  }
}

@keyframes starfield-move {
  from {
    transform: translateY(0) translateX(0);
  }
  to {
    transform: translateY(-300px) translateX(-550px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.tiktok-tags-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(25px);
  border-radius: 20px 20px 0 0;
  padding: 20px;
  max-height: 70vh;
  overflow: hidden;
  z-index: 20;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: white;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .panel-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 500;
  }

  .close-tags {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  padding-bottom: 50px;
  overscroll-behavior: contain;
  touch-action: pan-y;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }
}

.panel-section {
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 18px;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &.danger {
    border-color: rgba(255, 86, 86, 0.3);
    background: rgba(255, 86, 86, 0.08);
    color: #ff6b6b;

    &:hover {
      background: rgba(255, 86, 86, 0.15);
      border-color: rgba(255, 86, 86, 0.5);
    }
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prompt-content {
  code {
    font-size: 13px;
    display: block;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6em;
    color: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.05);

    :deep() {
      .natural-text {
        margin: 0.5em 0;
        line-height: 1.6em;
        text-align: justify;
        color: rgba(255, 255, 255, 0.8);
      }

      .short-tag {
        word-break: break-all;
        white-space: nowrap;
      }

      span.tag {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.9);
        padding: 3px 6px;
        border-radius: 4px;
        margin-right: 6px;
        margin-top: 4px;
        line-height: 1.3em;
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .has-parentheses.tag {
        background: rgba(255, 100, 100, 0.15);
        border-color: rgba(255, 100, 100, 0.2);
      }
    }
  }
}

.prompt-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.prompt-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
  font-weight: 500;
}

.prompt-empty {
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  padding: 8px 0;
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

  .panel-action-btn {
    width: 32px;
    height: 32px;
  }
}
</style>