import { watch } from 'vue'
import {
  useWatchDocument
} from 'vue3-ts-util'
import { FileTransferData, getFileTransferDataFromDragEvent } from '@/util/file'
import { useHookShareState, global, events, sli } from '.'
import { copyFiles, moveFiles } from '@/api/files'
import { MultiSelectTips } from '@/components/functionalCallableComp'
import { t } from '@/i18n'
import { createReactiveQueue } from '@/util'
import { Modal, Button } from 'ant-design-vue'

import { cloneDeep, uniqBy } from 'lodash-es'

export function useFileTransfer () {
  const { currLocation, sortedFiles, currPage, multiSelectedIdxs, eventEmitter, walker } =
    useHookShareState().toRefs()
  const recover = () => {
    multiSelectedIdxs.value = []
  }
  useWatchDocument('click', () => {
    if (!global.keepMultiSelect) {
      recover()
    }
  })
  useWatchDocument('blur', () => {
    if (!global.keepMultiSelect) {
      recover()
    }
  })
  watch(currPage, recover)

  const onFileDragStart = (e: DragEvent, idx: number) => {
    const file = cloneDeep(sortedFiles.value[idx])
    sli.fileDragging = true
    console.log('onFileDragStart set drag file ', e, idx, file)
    const files = [file]
    let includeDir = file.type === 'dir'
    if (multiSelectedIdxs.value.includes(idx)) {
      const selectedFiles = multiSelectedIdxs.value.map((idx) => sortedFiles.value[idx])
      files.push(...selectedFiles)
      includeDir = selectedFiles.some((v) => v.type === 'dir')
    }
    const data: FileTransferData = {
      includeDir,
      loc: currLocation.value || 'search-result',
      path: uniqBy(files, 'fullpath').map((f) => f.fullpath),
      nodes: uniqBy(files, 'fullpath'),
      __id: 'FileTransferData'
    }
    e.dataTransfer!.setData('text/plain', JSON.stringify(data))
  }

  const onFileDragEnd = () => {
    sli.fileDragging = false
  }

  const onDrop = async (e: DragEvent) => {
    if (walker.value) {
      return
    }
    const data = getFileTransferDataFromDragEvent(e)
    if (!data) {
      return
    }
    const toPath = currLocation.value
    if (data.loc === toPath) {
      return
    }
    const q = createReactiveQueue()
    const onCopyBtnClick = async () => q.pushAction(async () => {
      await copyFiles(data.path, toPath)
      eventEmitter.value.emit('refresh')
      Modal.destroyAll()
    })

    const onMoveBtnClick = () => q.pushAction(async () => {
      await moveFiles(data.path, toPath)
      events.emit('removeFiles', { paths: data.path, loc: data.loc })
      eventEmitter.value.emit('refresh')
      Modal.destroyAll()
    })
    Modal.confirm({
      title: t('confirm') + '?',
      width: '60vw',
      content: () => <div>
        <div>
          {`${t('moveSelectedFilesTo')} ${toPath}`}
          <ol style={{ maxHeight: '50vh', overflow: 'auto' }}>
            {data.path.map((v) => <li>{v.split(/[/\\]/).pop()}</li>)}
          </ol>
        </div>
        <MultiSelectTips />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} class="actions">
          <Button onClick={Modal.destroyAll}>{t('cancel')}</Button>
          <Button type="primary" loading={!q.isIdle} onClick={onCopyBtnClick}>{t('copy')}</Button>
          <Button type="primary" loading={!q.isIdle} onClick={onMoveBtnClick}>{t('move')}</Button>
        </div>
      </div>,
      maskClosable: true,
      wrapClassName: 'hidden-antd-btns-modal'
    })
  }
  return {
    onFileDragStart,
    onDrop,
    multiSelectedIdxs,
    onFileDragEnd
  }
}