<script lang="ts" setup>
// @ts-ignore
import { RecycleScroller } from '@zanllp/vue-virtual-scroller'
import '@zanllp/vue-virtual-scroller/dist/vue-virtual-scroller.css'
import FileItem from '@/components/FileItem.vue'
import { useBatchDownloadStore } from '@/store/useBatchDownloadStore'
import { storeToRefs } from 'pinia'
import { useFilesDisplay, useHookShareState } from '@/page/fileTransfer/hook'
import { getFileTransferDataFromDragEvent, toRawFileUrl } from '@/util/file'
import { axiosInst } from '@/api'
import { createReactiveQueue } from '@/util'
const { stackViewEl } = useHookShareState().toRefs()
const { itemSize, gridItems, cellWidth } = useFilesDisplay()
const store = useBatchDownloadStore()
const { selectdFiles } = storeToRefs(store)
const q = createReactiveQueue()
defineProps<{
  tabIdx: number
  paneIdx: number
  id: string
}>()
const onDrop = async (e: DragEvent) => {
  const data = getFileTransferDataFromDragEvent(e)
  if (data) {
    store.addFiles(data.nodes)
  }
}

const onDownloadClick = async () => {
  q.pushAction(async () => {
    const resp = await axiosInst.value.post('/zip', { paths: selectdFiles.value.map(v => v.fullpath) }, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([resp.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `iib_${new Date().toLocaleString()}.zip`)
    document.body.appendChild(link)
    link.click()
  })
}
const onDeleteClick = (idx: number) => {
  selectdFiles.value.splice(idx, 1)
}
</script>
<template>
  <div class="container" ref="stackViewEl" @drop="onDrop">
    <div class="actions-panel actions">
      <AButton @click="store.selectdFiles = []">{{ $t('clear') }}</AButton>
      <AButton @click="onDownloadClick" type="primary" :loading="!q.isIdle">{{ $t('zipDownload') }}</AButton>
    </div>
    <div v-if="!selectdFiles.length" class="file-list">
      <p class="hint">{{ $t('batchDownloaDDragAndDropHint') }}</p>
    </div>
    <RecycleScroller ref="scroller" v-else class="file-list" :items="selectdFiles.slice()" :item-size="itemSize.first"
      key-field="fullpath" :item-secondary-size="itemSize.second" :gridItems="gridItems">
      <template v-slot="{ item: file, index: idx }">
        <file-item :idx="idx" :file="file" :cell-width="cellWidth" enable-close-icon
          @close-icon-click="onDeleteClick(idx)" :full-screen-preview-image-url="toRawFileUrl(file)"
          :enable-right-click-menu="false" />
      </template>
    </RecycleScroller>
  </div>
</template>
<style scoped lang="scss">
.container {
  background: var(--zp-secondary-background);

  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;

  .actions-panel {
    padding: 8px;
    background-color: var(--zp-primary-background);
  }

  .file-list {
    flex: 1;
    list-style: none;
    padding: 8px;
    height: var(--pane-max-height);
    width: 100%;

    .hint {
      text-align: center;
      font-size: 2em;
      padding: 30vh 128px 0;
    }
  }
}
</style>
