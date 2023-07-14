<script setup lang="ts">
import { FileOutlined, FolderOpenOutlined, EllipsisOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { fallbackImage } from 'vue3-ts-util'
import type { FileNodeInfo } from '@/api/files'
import { createReactiveQueue, isImageFile } from '@/util'
import { toImageThumbnailUrl, toRawFileUrl } from './hook'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { computed, ref } from 'vue'
import { getImageSelectedCustomTag, type Tag } from '@/api/db'
import ContextMenu from './ContextMenu.vue'

const global = useGlobalStore()
const props = withDefaults(
  defineProps<{
    file: FileNodeInfo
    idx: number
    selected?: boolean
    showMenuIdx?: number
    cellWidth: number
    fullScreenPreviewImageUrl?: string
  }>(),
  { selected: false }
)

const emit = defineEmits<{
  (type: 'update:showMenuIdx', v: number): void
  (type: 'fileItemClick', event: MouseEvent, file: FileNodeInfo, idx: number): void
  (type: 'dragstart', event: DragEvent, idx: number): void
  (type: 'dragend', event: DragEvent, idx: number): void
  (type: 'previewVisibleChange', value: boolean, last: boolean): void
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()

const selectedTag = ref([] as Tag[])
const onRightClick = () => {
  if (props?.file?.type !== 'file') {
    return
  }
  q.pushAction(() => getImageSelectedCustomTag(props.file.fullpath)).res.then((res) => {
    selectedTag.value = res
  })
}

const q = createReactiveQueue()
const imageSrc = computed(() => {
  const r =  global.gridThumbnailResolution
  return global.enableThumbnail ? toImageThumbnailUrl(props.file, [r,r].join('x')) : toRawFileUrl(props.file)
})
</script>
<template>
  <a-dropdown
    :trigger="['contextmenu']"
    :visible="
      !global.longPressOpenContextMenu ? undefined : typeof idx === 'number' && showMenuIdx === idx
    "
    @update:visible="(v: boolean) => typeof idx === 'number' && emit('update:showMenuIdx', v ? idx : -1)"
  >
    <li
      class="file file-item-trigger grid"
      :class="{
        clickable: file.type === 'dir',
        selected
      }"
      :data-idx="idx"
      :key="file.name"
      draggable="true"
      @dragstart="emit('dragstart', $event, idx)"
      @dragend="emit('dragend', $event, idx)"
      @contextmenu="onRightClick"
      @click.capture="emit('fileItemClick', $event, file, idx)"
    >
      <div >
        <a-dropdown>
          <div class="more">
            <ellipsis-outlined />
          </div>
          <template #overlay>
            <context-menu
              :file="file"
              :idx="idx"
              :selected-tag="selectedTag"
              @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)"
            />
          </template>
        </a-dropdown>
        <!-- :key="fullScreenPreviewImageUrl ? undefined : file.fullpath" 
          这么复杂是因为再全屏预览时可能因为直接删除导致fullpath变化，然后整个预览直接退出-->
        <a-image
          :key="file.fullpath"
          :class="`idx-${idx}`"
          v-if="isImageFile(file.name) "
          :src="imageSrc"
          :fallback="fallbackImage"
          :preview="{
            src: fullScreenPreviewImageUrl,
            onVisibleChange: (v: boolean, lv: boolean) => emit('previewVisibleChange', v, lv)
          }"
        >
        </a-image>
        <div v-else class="preview-icon-wrap">
          <file-outlined class="icon center" v-if="file.type === 'file'" />
          <folder-open-outlined class="icon center" v-else />
        </div>
        <div class="profile" v-if="cellWidth > 128">
          <div class="name line-clamp-1">
            {{ file.name }}
          </div>
          <div class="basic-info">
            <div>
              {{ file.size }}
            </div>
            <div>
              {{ file.date }}
            </div>
          </div>
        </div>
      </div>
    </li>
    <template #overlay>
      <context-menu
        :file="file"
        :idx="idx"
        :selected-tag="selectedTag"
        @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)"
      />
    </template>
  </a-dropdown>
</template>
<style lang="scss" scoped>
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.file {
  padding: 8px 16px;
  margin: 8px;
  display: flex;
  align-items: center;
  background: var(--zp-primary-background);
  border-radius: 8px;
  box-shadow: 0 0 4px var(--zp-secondary-variant-background);
  position: relative;
  overflow: hidden;

  &:hover .more {
    opacity: 1;
  }

  .more {
    opacity: 0;
    transition: all 0.3s ease;
    position: absolute;
    top: 4px;
    right: 4px;
    cursor: pointer;
    z-index: 100;
    font-size: 500;
    font-size: 1.8em;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 100vh;
    color: white;
    background: var(--zp-icon-bg);
  }

  &.grid {
    padding: 0;
    display: inline-block;
    box-sizing: content-box;
    box-shadow: unset;

    background-color: var(--zp-secondary-background);

    :deep() {
      .icon {
        font-size: 8em;
      }

      .profile {
        padding: 0 4px;

        .name {
          font-weight: 500;
          padding: 0;
        }

        .basic-info {
          display: flex;
          justify-content: space-between;
          flex-direction: row;
          margin: 0;
          font-size: 0.7em;
        }
      }

      .ant-image,
      .preview-icon-wrap {
        border: 1px solid var(--zp-secondary);
        background-color: var(--zp-secondary-variant-background);
        border-radius: 8px;
        overflow: hidden;
      }

      img,
      .preview-icon-wrap > [role='img'] {
        height: v-bind('$props.cellWidth + "px"');
        width: v-bind('$props.cellWidth + "px"');
        object-fit: contain;
      }
    }
  }


  &.clickable {
    cursor: pointer;
  }

  &.selected {
    outline: #0084ff solid 2px;
  }

  .name {
    flex: 1;
    padding: 8px;
    word-break: break-all;
  }

  .basic-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>
