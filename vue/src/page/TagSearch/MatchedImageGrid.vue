<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { FetchQueue, copy2clipboard, delay } from 'vue3-ts-util'
import fileItemCell from '@/page/fileTransfer/FileItem.vue'
import type { FileNodeInfo } from '@/api/files'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import {
  useFilesDisplay, type Scroller, useHookShareState,
  useMobileOptimization, useFileItemActions, toRawFileUrl
} from '@/page/fileTransfer/hook'
import { identity } from 'lodash-es'
import { getImagesByTags } from '@/api/db'
import { watch } from 'vue'

const images = ref<FileNodeInfo[]>()

const queue = reactive(new FetchQueue(-1, 0, -1, 'throw'))

const props = defineProps<{ tabIdx: number, paneIdx: number, selectedTagIds: number[], id: string }>()

watch(() => props.selectedTagIds, async () => {
  const { res } = queue.pushAction(() => getImagesByTags(props.selectedTagIds))
  images.value = await res
  scroller.value?.scrollToItem(0)
}, { immediate: true })

const scroller = ref<Scroller>()

const propsMock = { tabIdx: -1, target: 'local', paneIdx: -1 } as const
const { stackViewEl, multiSelectedIdxs } = useHookShareState().toRefs()
const { itemSize, gridItems } = useFilesDisplay(propsMock)
const { showMenuIdx } = useMobileOptimization()
const { showGenInfo, imageGenInfo, q: genInfoQueue, onContextMenuClick } = useFileItemActions(propsMock, { openNext: identity })

const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
  await onContextMenuClick(e, file, idx)
  if (e.key === "deleteFiles") {
    const idxs = multiSelectedIdxs.value.includes(idx) ? multiSelectedIdxs.value : [idx]
    images.value = images.value!.filter((_, idx) => !idxs.includes(idx))
  }
}

</script>
<template>
  <div class="container" ref="stackViewEl">
    <ASpin size="large" :spinning="!queue.isIdle">
      <AModal v-model:visible="showGenInfo" width="70vw" mask-closable @ok="showGenInfo = false">
        <template #cancelText />
        <ASkeleton active :loading="!genInfoQueue.isIdle">
          <div style="width: 100%; word-break: break-all;white-space: pre-line;max-height: 70vh;overflow: auto;"
            @dblclick="copy2clipboard(imageGenInfo, 'copied')">
            <div class="hint">{{ $t('doubleClickToCopy') }}</div>
            {{ imageGenInfo }}
          </div>
        </ASkeleton>
      </AModal>
      <RecycleScroller ref="scroller" class="file-list" :items="images || []" :item-size="itemSize.first"
        key-field="fullpath" :item-secondary-size="itemSize.second" :gridItems="gridItems">
        <template v-slot="{ item: file, index: idx }">
          <!-- idx 和file有可能丢失 -->
          <file-item-cell :idx="idx" :file="file" v-model:show-menu-idx="showMenuIdx"
            :full-screen-preview-image-url="toRawFileUrl(file)" @context-menu-click="onContextMenuClickU" />
        </template>
      </RecycleScroller>
    </ASpin>
  </div>
</template>
<style scoped lang="scss">
.container {

  background: var(--zp-secondary-background);

  .file-list {
    list-style: none;
    padding: 8px;
    height: 100%;
    overflow: auto;
    height: var(--pane-max-height);
    width: 100%;
  }
}
</style>
