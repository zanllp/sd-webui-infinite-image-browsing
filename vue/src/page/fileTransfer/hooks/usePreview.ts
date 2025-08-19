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



  // Mouse event handlers for desktop drag
  const handleMouseDown = (e: MouseEvent) => {
    console.log('Mouse down event')
    if (!previewing.value) return
    
    console.log('Mouse down detected on preview image')
    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragCurrentX.value = e.clientX
    dragCurrentY.value = e.clientY
    swipeDirection.value = null
    
    // Prevent text selection during drag
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || !previewing.value) return
    console.log('mouse move event')
    
    dragCurrentX.value = e.clientX
    dragCurrentY.value = e.clientY
    
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



  const handleMouseUp = (_e: MouseEvent) => {
    if (!isDragging.value || !previewing.value) return
    console.log('Mouse up event')
    
    console.log('Mouse up detected, checking for swipe')
    const deltaX = dragCurrentX.value - dragStartX.value
    const deltaY = dragCurrentY.value - dragStartY.value
    
    console.log('Swipe delta:', { deltaX, deltaY, threshold: swipeThreshold, direction: swipeDirection.value })
    
    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0 && swipeDirection.value === 'right') {
        // Swipe right - go to previous image
        console.log('Swiping right - going to previous image')
        if (canPreview('prev')) {
          previewImgMove('prev')
        }
      } else if (deltaX < 0 && swipeDirection.value === 'left') {
        // Swipe left - go to next image
        console.log('Swiping left - going to next image')
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

  //TODO
  //disable swipe and touch control if picture zoomed in
  //allow horizontal scrolling when pic zoomed in


  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: TouchEvent) => {
    if (!previewing.value || e.touches.length !== 1) return
    
    console.log('Touch start detected on preview image')
    const touch = e.touches[0]
    isDragging.value = true
    dragStartX.value = touch.clientX
    dragStartY.value = touch.clientY
    dragCurrentX.value = touch.clientX
    dragCurrentY.value = touch.clientY
    swipeDirection.value = null
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.value || !previewing.value || e.touches.length !== 1) return
    
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
    
    // Prevent page scrolling during horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (_e: TouchEvent) => {
    if (!isDragging.value || !previewing.value) return
    
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
    
    // Use polling to wait for the preview image element to be ready
    const waitForPreviewImage = () => {
      // Try multiple selectors for Ant Design image preview
      // const elements = document.querySelectorAll('.ant-image-preview-mask')
      // console.log('possible masks: ', elements.length)
      // let testSelect = Array.from(elements).filter(el => {
      //   const styleAttr = el.getAttribute('style');
      //   return styleAttr === '' || styleAttr === null;
      // })
      // if (testSelect.length > 0) { 
      //   console.log('preivew mask select success: ', testSelect.length)
      // }
      // const previewMask = testSelect[0]
      // if (testSelect.length > 0) { 
      //   console.log('preview mask: ', previewMask)
      // }else{
      //   console.log('preview mask select fail')
      // }
      // let previewImg = previewMask.querySelector('.ant-image-preview-img') as HTMLElement

      //let previewImg = document.querySelector('.ant-image-preview-img') as HTMLElement
      
      // // Fallback selectors if the main one doesn't work
      // if (!previewImg) {
      //   console.log('preview select fail 1')
      //   previewImg = document.querySelector('.ant-image-preview img') as HTMLElement
      // }
      // if (!previewImg) {
      //   console.log('preview select fail 2')
      //   previewImg = document.querySelector('.ant-image-preview .ant-image-img') as HTMLElement
      // }
      // if (!previewImg) {
      //   // Try to find any image in the preview modal
      //   const previewModal = document.querySelector('.ant-image-preview')
      //   if (previewModal) {
      //     console.log('Preview selector fail 3')
      //     previewImg = previewModal.querySelector('img') as HTMLElement
      //   }
      // }
      
      //if (previewImg) {
        // Mouse events for desktop
      document.addEventListener('mousedown', handleMouseDown, { capture: true })
      document.addEventListener('mousemove', handleMouseMove, { capture: true })
      document.addEventListener('mouseup', handleMouseUp, { capture: true })
      
      // Touch events for mobile
      document.addEventListener('touchstart', handleTouchStart, { passive: false })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      //console.log('Swipe listeners attached to preview image:', previewImg)
      return true
      //}
      
      // // Debug: log what we found
      // const debugElements = document.querySelectorAll('.ant-image-preview, .ant-image-preview-img, .ant-image-preview img')
      // console.log('Debug: Found preview elements:', debugElements.length, debugElements)
      
      // return false
    }
    
    // Try immediately first
    if (!waitForPreviewImage()) {
      // If not ready, poll every 50ms for up to 2 seconds
      let attempts = 0
      const maxAttempts = 40 // 40 * 50ms = 2 seconds
      
      const pollForImage = () => {
        attempts++
        if (waitForPreviewImage() || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            console.warn('Failed to attach swipe listeners: preview image not found after 2 seconds')
          }
          return
        }
        setTimeout(pollForImage, 50)
      }
      
      setTimeout(pollForImage, 50)
    }
  }

  const removeSwipeListeners = () => {
    // const previewImg = document.querySelector('.ant-image-preview-img') as HTMLElement
    // if (previewImg) {
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    
  }

  // Watch for preview state changes to add/remove listeners
  const setupSwipeListeners = () => {
    if (previewing.value) {
      console.log('Preview opened, setting up swipe listeners')
      // Add listeners immediately - the addSwipeListeners function will handle waiting for the image
      addSwipeListeners()
    } else {
      console.log('Preview closed, removing swipe listeners')
      removeSwipeListeners()
    }
  }

  // Watch preview state changes
  watch(previewing, setupSwipeListeners)
  
  // Also watch for changes in the preview index to reattach listeners if needed
  watch(previewIdx, () => {
    if (previewing.value) {
      console.log('Preview index changed, reattaching swipe listeners')
      // Small delay to ensure the new image is loaded
      setTimeout(() => {
        addSwipeListeners()
      }, 200)
    }
  })

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
