import { createReactiveQueue } from '@/util'
import { identity } from 'lodash-es'
import { reactive, computed } from 'vue'
import {
  useHookShareState,
  useFilesDisplay,
  useMobileOptimization,
  useFileTransfer,
  useFileItemActions,
  usePreview,
  useEventListen
} from '../fileTransfer/hook'
import { makeAsyncIterator } from 'vue3-ts-util'
import { getImagesByTags } from '@/api/db'

export const createImageSearchIter = (
  fetchfn: (cursor: string) => ReturnType<typeof getImagesByTags>
) => {
  return reactive(makeAsyncIterator(fetchfn, (v) => v.files, {
    dataUpdateStrategy: 'merge'
  }))
}

export const useImageSearch = (iter: ReturnType<typeof createImageSearchIter>) => {
  const deletedImagePahts = reactive(new Set<String>())
  const images = computed(() => (iter.res ?? []).filter((v) => !deletedImagePahts.has(v.fullpath)))
  const queue = createReactiveQueue()
  const { stackViewEl, multiSelectedIdxs, stack, scroller } = useHookShareState({
    images: images as any
  }).toRefs()
  const { itemSize, gridItems, cellWidth, onScroll } = useFilesDisplay({ fetchNext: () => iter.next() })
  const { showMenuIdx } = useMobileOptimization()
  const { onFileDragStart, onFileDragEnd } = useFileTransfer()
  const {
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick
  } = useFileItemActions({ openNext: identity })
  const { previewIdx, previewing, onPreviewVisibleChange, previewImgMove, canPreview } = usePreview()

  const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
    stack.value = [{ curr: '', files: images.value! }] // hack，for delete multi files
    await onContextMenuClick(e, file, idx)
  }

  useEventListen('removeFiles', async ({ paths }) => {
    paths.forEach((v) => deletedImagePahts.add(v))
  })


  return {
    images,
    scroller,
    queue,
    iter,
    onContextMenuClickU,
    stackViewEl,
    previewIdx,
    previewing,
    onPreviewVisibleChange,
    previewImgMove,
    canPreview,
    itemSize,
    gridItems,
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick,
    showMenuIdx,
    multiSelectedIdxs,
    onFileDragStart,
    onFileDragEnd,
    cellWidth,
    onScroll
  }
}
