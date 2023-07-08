import { onMounted, onBeforeUnmount, type Ref, watch } from 'vue'

interface ResizeHandle {
  x: number
  y: number
}

interface UseResizeAndDragOptions {
  onResize?: (width: number, height: number) => void
  onDrag?: (left: number, top: number) => void
  left?: number
  top?: number
  width?: number
  height?: number
}

export function useResizeAndDrag(
  elementRef: Ref<HTMLElement | undefined>,
  resizeHandleRef: Ref<HTMLElement | undefined>,
  dragHandleRef: Ref<HTMLElement | undefined>,
  options?: UseResizeAndDragOptions
) {
  const resizeHandle: ResizeHandle = { x: 0, y: 0 }
  let startX = 0
  let startY = 0
  let startWidth = typeof options?.width === 'number' ? options.width : 0
  let startHeight = typeof options?.height === 'number' ? options.height : 0
  let startLeft = typeof options?.left === 'number' ? options.left : 0
  let startTop = typeof options?.top === 'number' ? options.top : 0
  let isDragging = false

  const handleResizeMouseDown = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!elementRef.value || !resizeHandleRef.value) return

    startX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
    startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
    startWidth = elementRef.value.offsetWidth
    startHeight = elementRef.value.offsetHeight
    resizeHandle.x = resizeHandleRef.value.offsetLeft
    resizeHandle.y = resizeHandleRef.value.offsetTop

    document.documentElement.addEventListener('mousemove', handleResizeMouseMove)
    document.documentElement.addEventListener('touchmove', handleResizeMouseMove)
    document.documentElement.addEventListener('mouseup', handleResizeMouseUp)
    document.documentElement.addEventListener('touchend', handleResizeMouseUp)
  }

  const handleResizeMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!elementRef.value || !resizeHandleRef.value) return

    let width = startWidth + ((e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - startX)
    let height =
      startHeight + ((e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - startY)
    let handleX =
      resizeHandle.x + ((e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - startX)
    let handleY =
      resizeHandle.y + ((e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - startY)

    // Check if element exceeds viewport width
    if (handleX + resizeHandleRef.value.offsetWidth > window.innerWidth) {
      handleX = window.innerWidth - resizeHandleRef.value.offsetWidth
    }
    if (elementRef.value.offsetLeft + width > window.innerWidth) {
      width = window.innerWidth - elementRef.value.offsetLeft
    }

    // Check if element exceeds viewport height
    if (handleY + resizeHandleRef.value.offsetHeight > window.innerHeight) {
      handleY = window.innerHeight - resizeHandleRef.value.offsetHeight
    }
    if (elementRef.value.offsetTop + height > window.innerHeight) {
      height = window.innerHeight - elementRef.value.offsetTop
    }

    elementRef.value.style.width = `${width}px`
    elementRef.value.style.height = `${height}px`
    resizeHandleRef.value.style.left = `${handleX}px`
    resizeHandleRef.value.style.top = `${handleY}px`

    if (options?.onResize) {
      options.onResize(width, height)
    }
  }

  const handleResizeMouseUp = () => {
    document.documentElement.removeEventListener('mousemove', handleResizeMouseMove)
    document.documentElement.removeEventListener('touchmove', handleResizeMouseMove)
    document.documentElement.removeEventListener('mouseup', handleResizeMouseUp)
    document.documentElement.removeEventListener('touchend', handleResizeMouseUp)
  }

  const handleDragMouseDown = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!elementRef.value || !dragHandleRef.value) return
    isDragging = true
    startLeft = elementRef.value.offsetLeft
    startTop = elementRef.value.offsetTop
    startX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
    startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
    document.documentElement.addEventListener('mousemove', handleDragMouseMove)
    document.documentElement.addEventListener('touchmove', handleDragMouseMove)
    document.documentElement.addEventListener('mouseup', handleDragMouseUp)
    document.documentElement.addEventListener('touchend', handleDragMouseUp)
  }

  const handleDragMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!elementRef.value || !dragHandleRef.value || !isDragging) return
    const left = startLeft + ((e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - startX)
    const top = startTop + ((e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - startY)

    // Check if element exceeds viewport width
    if (left < 0) {
      elementRef.value.style.left = '0px'
    } else if (left + elementRef.value.offsetWidth > window.innerWidth) {
      elementRef.value.style.left = `${window.innerWidth - elementRef.value.offsetWidth}px`
    } else {
      elementRef.value.style.left = `${left}px`
    }

    // Check if element exceeds viewport height
    if (top < 0) {
      elementRef.value.style.top = '0px'
    } else if (top + elementRef.value.offsetHeight > window.innerHeight) {
      elementRef.value.style.top = `${window.innerHeight - elementRef.value.offsetHeight}px`
    } else {
      elementRef.value.style.top = `${top}px`
    }

    if (options?.onDrag) {
      options.onDrag(left, top)
    }
  }

  const handleDragMouseUp = () => {
    isDragging = false
    document.documentElement.removeEventListener('mousemove', handleDragMouseMove)
    document.documentElement.removeEventListener('touchmove', handleDragMouseMove)
    document.documentElement.removeEventListener('mouseup', handleDragMouseUp)
    document.documentElement.removeEventListener('touchend', handleDragMouseUp)
  }

  const handleWindowResize = () => {
    if (!elementRef.value || !resizeHandleRef.value) return
    let left = elementRef.value.offsetLeft
    let top = elementRef.value.offsetTop
    let width = elementRef.value.offsetWidth
    let height = elementRef.value.offsetHeight

    // Check if element exceeds viewport width
    if (left + width > window.innerWidth) {
      left = window.innerWidth - width
      if (left < 0) {
        left = 0
        width = window.innerWidth                                 
      }
    }

    // Check if element exceeds viewport height
    if (top + height > window.innerHeight) {
      top = window.innerHeight - height
      if (top < 0) {
        top = 0
        height = window.innerHeight
      }
    }

    // Update element position and size
    elementRef.value.style.left = `${left}px`
    elementRef.value.style.top = `${top}px`
    elementRef.value.style.width = `${width}px`
    elementRef.value.style.height = `${height}px`
  }
  onMounted(() => {
    if (!elementRef.value || !options) return
    if (typeof options.width === 'number') {
      elementRef.value.style.width = `${options.width}px`
    }
    if (typeof options.height === 'number') {
      elementRef.value.style.height = `${options.height}px`
    }
    if (typeof options.left === 'number') {
      elementRef.value.style.left = `${options.left}px`
    }
    if (typeof options.top === 'number') {
      elementRef.value.style.top = `${options.top}px`
    }
    handleWindowResize()
    window.addEventListener('resize', handleWindowResize)
  })

  onBeforeUnmount(() => {
    document.documentElement.removeEventListener('mousemove', handleResizeMouseMove)
    document.documentElement.removeEventListener('touchmove', handleResizeMouseMove)
    document.documentElement.removeEventListener('mouseup', handleResizeMouseUp)
    document.documentElement.removeEventListener('touchend', handleResizeMouseUp)
    document.documentElement.removeEventListener('mousemove', handleDragMouseMove)
    document.documentElement.removeEventListener('touchmove', handleDragMouseMove)
    document.documentElement.removeEventListener('mouseup', handleDragMouseUp)
    document.documentElement.removeEventListener('touchend', handleDragMouseUp)
    window.removeEventListener('resize', handleWindowResize)
  })

  watch(
    () => [elementRef.value, resizeHandleRef.value, dragHandleRef.value],
    ([element, resizeHandle, dragHandle]) => {
      if (element && resizeHandle) {
        resizeHandle.addEventListener('mousedown', handleResizeMouseDown)
        resizeHandle.addEventListener('touchstart', handleResizeMouseDown)
      }
      if (element && dragHandle) {
        dragHandle.addEventListener('mousedown', handleDragMouseDown)
        dragHandle.addEventListener('touchstart', handleDragMouseDown)
      }
    }
  )

  return {
    handleResizeMouseDown,
    handleDragMouseDown
  }
}
