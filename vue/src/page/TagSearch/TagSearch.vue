<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo, getImagesByTags } from '@/api/db'
import { FetchQueue, copy2clipboard } from 'vue3-ts-util'
import { CheckOutlined } from '@/icon'
import fileItemCell from '@/page/fileTransfer/FileItem.vue'
import type { FileNodeInfo } from '@/api/files'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import { useFilesDisplay, useHookShareState, useMobileOptimization, useFileItemActions } from '@/page/fileTransfer/hook'
import { identity } from 'lodash-es'

const queue = reactive(new FetchQueue())
const info = ref<DataBaseBasicInfo>()
const selectedId = ref(new Set<number>())
const tags = computed(() => info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : [])
const images = ref<FileNodeInfo[]>()

onMounted(async () => {
  info.value = await getDbBasicInfo()
  console.log(info, tags)
})

const onUpdateBtnClick = async () => {
  queue.pushAction(async () => {
    await updateImageData()
    info.value = await getDbBasicInfo()

  })
}

const propsMock = { tabIdx: -1, target: 'local', paneIdx: -1 } as const
const { stackViewEl,  } = useHookShareState().toRefs()
const { itemSize, gridItems } = useFilesDisplay(propsMock)
const { showMenuIdx } = useMobileOptimization()
const {showGenInfo, imageGenInfo, q: genInfoQueue, onContextMenuClick } = useFileItemActions(propsMock, { openNext: identity })

const query = async () => {
  const { res } = queue.pushAction(() => getImagesByTags(Array.from(selectedId.value)))
  images.value = (await res)
}

</script>
<template>
  <div class="container" ref="stackViewEl">      
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
    <template v-if="info">

      <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary" v-if="info.expired || !info.img_count">{{
        info.img_count === 0 ? 'gen idx' : 'updat index' }}</AButton>
      <AButton v-else type="primary" @click="query" :loading="!queue.isIdle">search</AButton>
      <ul class="tag-list">
        <li v-for="tag in tags" :key="tag.id" class="tag " :class="{ selected: selectedId.has(tag.id) }"
          @click="selectedId.has(tag.id) ? selectedId.delete(tag.id) : selectedId.add(tag.id)">
          <CheckOutlined v-if="selectedId.has(tag.id)" />
          {{ tag.name }}
        </li>
      </ul>
    </template>
    {{gridItems}}
    <RecycleScroller class="file-list" :items="images || []" :item-size="itemSize.first" key-field="fullpath"
      :item-secondary-size="itemSize.second" :gridItems="gridItems">
      <template v-slot="{ item: file, index: idx }">
        <!-- idx 和file有可能丢失 -->
        <file-item-cell :idx="idx" :file="file" v-model:show-menu-idx="showMenuIdx" @context-menu-click="onContextMenuClick"/>
      </template>
    </RecycleScroller>
  </div>
</template>
<style scoped lang="scss">
.container {
  height: 100%;
  overflow: auto;

  .file-list {
    list-style: none;
    padding: 8px;
    height: 50vh;
    overflow: auto;
    width: 100%;

  }

  .tag-list {
    list-style: none;
    padding: 0;
    max-height: 50vh;
    overflow: auto;

    .tag {
      border: 2px solid var(--zp-secondary);
      color: var(--zp-secondary);
      border-radius: 999px;
      padding: 2px 8px;
      margin: 4px;
      display: inline-block;
      cursor: pointer;

      &.selected {
        color: var(--primary-color);
        border: 2px solid var(--primary-color);
      }
    }
  }

}
</style>