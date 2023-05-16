import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo } from '@/api/db'
import type { FileNodeInfo } from '@/api/files'
import { createReactiveQueue, makeAsyncFunctionSingle } from '@/util'
import { identity } from 'lodash-es'
import { ref, onMounted } from 'vue'
import {
  useHookShareState,
  useFilesDisplay,
  useMobileOptimization,
  useFileTransfer,
  useFileItemActions,
  usePreview,
  type Scroller
} from '../fileTransfer/hook'

export const useImageSearch = () => {
  const images = ref<FileNodeInfo[]>()
  const queue = createReactiveQueue()
  const scroller = ref<Scroller>()
  const propsMock = { tabIdx: -1, target: 'local', paneIdx: -1, walkMode: false } as const
  const { stackViewEl, multiSelectedIdxs, stack } = useHookShareState().toRefs()
  const { itemSize, gridItems } = useFilesDisplay(propsMock)
  const { showMenuIdx } = useMobileOptimization()
  useFileTransfer() // for reset selected
  const {
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick
  } = useFileItemActions(propsMock, { openNext: identity })
  const { previewIdx, previewing, onPreviewVisibleChange, previewImgMove, canPreview } = usePreview(
    propsMock,
    { scroller, files: images }
  )

  const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
    stack.value = [{ curr: '', files: images.value! }] // hack，for delete multi files
    const idxs = multiSelectedIdxs.value.includes(idx) ? multiSelectedIdxs.value : [idx] // when click confirm ok button, idxs will be reset
    await onContextMenuClick(e, file, idx)
    if (e.key === 'deleteFiles') {
      images.value = images.value!.filter((_, idx) => !idxs.includes(idx))
    }
  }

  return {
    scroller,
    queue,
    images,
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
  }
}
