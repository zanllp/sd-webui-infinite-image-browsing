import { t } from '@/i18n'
import { isImageFile } from '@/util'
import { message } from 'ant-design-vue'
import { useWatchDocument } from 'vue3-ts-util'
import { useHookShareState, useEventListen } from '.'
import { closeImageFullscreenPreview } from '@/util/imagePreviewOperation'
import { ref, watch } from 'vue'

/**
 * 全屏查看
 * @param props
 * @returns
 */
export function usePreview (spec?: { loadNext?: () => void }) {
  const {
    previewIdx,
    eventEmitter,
    canLoadNext,
    previewing,
    sortedFiles: files,
    scroller,
    props
  } = useHookShareState().toRefs()
  const { state } = useHookShareState()
  let waitScrollTo = null as number | null
  
  // Swipe/drag state
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragCurrentX = ref(0)
  const dragCurrentY = ref(0)
  const swipeThreshold = 50 // Minimum distance to trigger navigation
  const swipeDirection = ref<'left' | 'right' | null>(null)
  const isZoomed = ref(false) // Track if image is zoomed in
  
  const onPreviewVisibleChange = (v: boolean, lv: boolean) => {
    previewing.value = v
    if (waitScrollTo != null && !v && lv) {
      // 关闭预览时滚动过去
      scroller.value?.scrollToItem(waitScrollTo)
      waitScrollTo = null
    }
  }

  const loadNextIfNeeded = () => {
    if (canPreview('next')) {
      return
    }
    if (spec?.loadNext) {
      return spec.loadNext()
    }
    if (props.value.mode === 'walk') {
      if (canLoadNext.value) {
        message.info(t('loadingNextFolder'))
        eventEmitter.value.emit('loadNextDir', true) // 如果在全屏查看时外面scroller可能还停留在很久之前，使用全屏查看的索引
      }
    }
  }

  /**
   * Get the currently visible preview image element
   * @returns HTMLElement of the active preview image or null
   */
  const getVisiblePreviewImage = () => {
    // Try multiple selectors for Ant Design image preview
    const elements = document.querySelectorAll('.ant-image-preview')
    
    // Find the visible preview mask (the one without display: none)
    let previewMask: HTMLElement | null = null
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement
      const style = window.getComputedStyle(el)
      if (style.display !== 'none') {
        previewMask = el
        break
      }
    }
    
    if (!previewMask) return null
    
    // Try to find the preview image within the mask
    let previewImg = previewMask.querySelector('.ant-image-preview-img') as HTMLElement
    
    // Fallback selectors if the main one doesn't work
    if (!previewImg) {
      previewImg = previewMask.querySelector('.ant-image-preview img') as HTMLElement
    }
    if (!previewImg) {
      previewImg = previewMask.querySelector('.ant-image-preview .ant-image-img') as HTMLElement
    }
    
    return previewImg
  }

  /**
   * Check if the preview image is currently zoomed in
   * @returns boolean indicating if image is zoomed
   */
  const checkIfZoomed = () => {
    const previewImg = getVisiblePreviewImage()
    if (!previewImg) return false
    
    // Check if image has been scaled (zoomed) - works for desktop zooming
    const style = window.getComputedStyle(previewImg)
    const transform = style.transform || style.webkitTransform
    if (transform && transform !== 'none') {
      // Extract scale value from transform matrix
      // transform is usually in format: matrix(scaleX, 0, 0, scaleY, 0, 0)
      const matrixValues = transform.match(/matrix\(([^)]+)\)/)
      if (matrixValues) {
        const values = matrixValues[1].split(',').map(val => parseFloat(val.trim()))
        const scaleX = Math.abs(values[0] || 1)
        const scaleY = Math.abs(values[3] || 1)
        
        // If scale is significantly different from 1, image is zoomed
        if (Math.abs(scaleX - 1) > 0.1 || Math.abs(scaleY - 1) > 0.1) {
          return true
        }
      }
    }
    
    // For mobile pinch zoom, check if the image dimensions exceed the viewport dimensions
    if (window.visualViewport){
      return window.visualViewport.scale > 1.1 //allow a guardband of residual zoom
    }
    return false
  }


  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: TouchEvent) => {
    if (!previewing.value || e.touches.length !== 1) return

    isZoomed.value = checkIfZoomed()
    if (isZoomed.value) {
      return
    }

    const touch = e.touches[0]
    isDragging.value = true
    dragStartX.value = touch.clientX
    dragStartY.value = touch.clientY
    dragCurrentX.value = touch.clientX
    dragCurrentY.value = touch.clientY
    swipeDirection.value = null
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || !previewing.value || e.touches.length !== 1 || isZoomed.value) return
    
    const touch = e.touches[0]
    dragCurrentX.value = touch.clientX
    dragCurrentY.value = touch.clientY
    
    // Calculate drag distance
    const deltaX = dragCurrentX.value - dragStartX.value
    const deltaY = dragCurrentY.value - dragStartY.value
    
    // Determine swipe direction (horizontal vs vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      if (deltaX > 0) {
        swipeDirection.value = 'right'
      } else {
        swipeDirection.value = 'left'
      }
    }
  }

  const handleTouchEnd = (_e: TouchEvent) => {
    if (!isDragging.value || !previewing.value || isZoomed.value) return
    
    const deltaX = dragCurrentX.value - dragStartX.value
    const deltaY = dragCurrentY.value - dragStartY.value
    
    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && swipeDirection.value === 'right') {
        // Swipe right - go to previous image
        if (canPreview('prev')) {
          previewImgMove('prev')
        }
      } else if (deltaX < 0 && swipeDirection.value === 'left') {
        // Swipe left - go to next image
        if (canPreview('next')) {
          previewImgMove('next')
        }
      }
    }
    
    // Reset drag state
    isDragging.value = false
    dragStartX.value = 0
    dragStartY.value = 0
    dragCurrentX.value = 0
    dragCurrentY.value = 0
    swipeDirection.value = null
  }
  
  // Add event listeners when preview is active
  const addSwipeListeners = () => {
    if (!previewing.value) return
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const removeSwipeListeners = () => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    
  }

  // Watch for preview state changes to add/remove listeners
  const setupSwipeListeners = () => {
    if (previewing.value) {
      addSwipeListeners()
    } else {
      removeSwipeListeners()
    }
  }

  // Watch preview state changes
  watch(previewing, setupSwipeListeners)

  useWatchDocument('keydown', (e) => {
    if (previewing.value) {
      let next = previewIdx.value
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
        next++
        while (files.value[next] && !isImageFile(files.value[next].name)) {
          next++
        }
      } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
        next--
        while (files.value[next] && !isImageFile(files.value[next].name)) {
          next--
        }
      }
      if (isImageFile(files.value[next]?.name) ?? '') {
        previewIdx.value = next
        const s = scroller.value
        if (s && !(next >= s.$_startIndex && next <= s.$_endIndex)) {
          waitScrollTo = next // 关闭预览时滚动过去
        }
      }
      loadNextIfNeeded()
    }
  })
  
  const previewImgMove = (type: 'next' | 'prev') => {
    let next = previewIdx.value
    if (type === 'next') {
      next++
      while (files.value[next] && !isImageFile(files.value[next].name)) {
        next++
      }
    } else if (type === 'prev') {
      next--
      while (files.value[next] && !isImageFile(files.value[next].name)) {
        next--
      }
    }
    if (isImageFile(files.value[next]?.name) ?? '') {
      previewIdx.value = next
      const s = scroller.value
      if (s && !(next >= s.$_startIndex && next <= s.$_endIndex)) {
        waitScrollTo = next // 关闭预览时滚动过去
      }
    }
    loadNextIfNeeded()
  }
  
  const canPreview = (type: 'next' | 'prev') => {
    let next = previewIdx.value
    if (type === 'next') {
      next++
      while (files.value[next] && !isImageFile(files.value[next].name)) {
        next++
      }
    } else if (type === 'prev') {
      next--
      while (files.value[next] && !isImageFile(files.value[next].name)) {
        next--
      }
    }
    return isImageFile(files.value[next]?.name)
  }

  useEventListen('removeFiles', async () => {
    if (previewing.value && !state.sortedFiles[previewIdx.value]) {
      closeImageFullscreenPreview()
    }
  })

  // Cleanup listeners when preview is closed
  // Note: This will be handled by the watch on previewing state

  return {
    previewIdx,
    onPreviewVisibleChange,
    previewing,
    previewImgMove,
    canPreview,
    isDragging,
    swipeDirection
  }
}
