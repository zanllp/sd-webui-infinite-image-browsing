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

    const width =
      startWidth + ((e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - startX)
    const height =
      startHeight + ((e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - startY)
    const handleX =
      resizeHandle.x + ((e instanceof MouseEvent ? e.clientX : e.touches[0].clientX) - startX)
    const handleY =
      resizeHandle.y + ((e instanceof MouseEvent ? e.clientY : e.touches[0].clientY) - startY)

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
    elementRef.value.style.left = `${left}px`
    elementRef.value.style.top = `${top}px`

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
