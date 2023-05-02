<script setup lang="ts">
import { FileOutlined, FolderOpenOutlined, StarFilled, StarOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { fallbackImage } from 'vue3-ts-util'
import type { FileNodeInfo } from '@/api/files'
import { createReactiveQueue, isImageFile } from '@/util'
import { toImageThumbnailUrl, toRawFileUrl, type ViewMode } from './hook'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { computed, ref } from 'vue'
import { getImageSelectedCustomTag, type Tag } from '@/api/db'

const global = useGlobalStore()
const props = withDefaults(
  defineProps<{
    file: FileNodeInfo
    idx: number
    selected?: boolean
    showMenuIdx?: number
    viewMode?: ViewMode
    fullScreenPreviewImageUrl?: string
  }>(),
  {  selected: false, viewMode: 'grid' }
)

const emit = defineEmits<{
  (type: 'update:showMenuIdx', v: number): void
  (type: 'fileItemClick', event: MouseEvent, file: FileNodeInfo, idx: number): void
  (type: 'dragstart', event: DragEvent, idx: number): void
  (type: 'previewVisibleChange', value: boolean, last: boolean): void
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()

const selectedTag = ref([] as Tag[])
const tags = computed(() => {
  return (global.conf?.all_custom_tags ?? []).reduce((p, c) => {
    return [...p, { ...c, selected: !!selectedTag.value.find((v) => v.id === c.id) }]
  }, [] as (Tag & { selected: boolean })[])
})
const onRightClick = () => {
  q.pushAction(() => getImageSelectedCustomTag(props.file.fullpath)).res.then((res) => {
    selectedTag.value = res
  })
}

const q = createReactiveQueue()
const thumbnailSize = computed(() =>
  props.viewMode === 'grid'
    ? [global.gridThumbnailSize, global.gridThumbnailSize].join()
    : [global.largeGridThumbnailSize, global.largeGridThumbnailSize].join()
)
</script>
<template>
  <a-dropdown
    :trigger="['contextmenu']"
    :visible="
      !global.longPressOpenContextMenu ? undefined : typeof idx === 'number' && showMenuIdx === idx
    "
    @update:visible="(v) => typeof idx === 'number' && emit('update:showMenuIdx', v ? idx : -1)"
  >
    <li
      class="file file-item-trigger"
      :class="{
        clickable: file.type === 'dir',
        selected,
        grid: viewMode === 'grid' || viewMode === 'large-size-grid',
        'large-grid': viewMode === 'large-size-grid'
      }"
      :data-idx="idx"
      :key="file.name"
      draggable="true"
      @dragstart="emit('dragstart', $event, idx)"
      @contextmenu="onRightClick"
      @click.capture="emit('fileItemClick', $event, file, idx)"
    >
      <div v-if="viewMode !== 'line'">
        <a-image
          :key="file.fullpath"
          :class="`idx-${idx}`"
          v-if="isImageFile(file.name)"
          :src="
            global.enableThumbnail ? toImageThumbnailUrl(file, thumbnailSize) : toRawFileUrl(file)
          "
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
        <div class="profile">
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
      <template v-else>
        <file-outlined class="icon" v-if="file.type === 'file'" />
        <folder-open-outlined class="icon" v-else />
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
      </template>
    </li>
    <template #overlay>
      <a-menu @click="emit('contextMenuClick', $event, file, idx)">
        <a-menu-item key="deleteFiles">{{ $t('deleteSelected') }}</a-menu-item>
        <template v-if="file.type === 'dir'">
          <a-menu-item key="openInNewTab">{{ $t('openInNewTab') }}</a-menu-item>
          <a-menu-item key="openOnTheRight">{{ $t('openOnTheRight') }}</a-menu-item>
          <a-menu-item key="openWithWalkMode">{{ $t('openWithWalkMode') }}</a-menu-item>
        </template>
        <template v-if="file.type === 'file'">
          <a-menu-item key="previewInNewWindow">{{ $t('previewInNewWindow') }}</a-menu-item>
          <a-menu-item key="download">{{ $t('downloadDirectly') }}</a-menu-item>
          <a-menu-item key="copyPreviewUrl">{{ $t('copySourceFilePreviewLink') }}</a-menu-item>
          <template v-if="isImageFile(file.name)">
            <a-menu-item key="viewGenInfo">{{ $t('viewGenerationInfo') }}</a-menu-item>
            <a-menu-item key="send2txt2img">{{ $t('sendToTxt2img') }}</a-menu-item>
            <a-menu-item key="send2img2img">{{ $t('sendToImg2img') }}</a-menu-item>
            <a-menu-item key="send2inpaint">{{ $t('sendToInpaint') }}</a-menu-item>
            <a-menu-item key="send2extras">{{ $t('sendToExtraFeatures') }}</a-menu-item>
            <a-menu-item key="send2savedDir">{{ $t('send2savedDir') }}</a-menu-item>
            <a-sub-menu key="toggle-tag" :title="$t('toggleTag')">
              <a-menu-item v-for="tag in tags" :key="tag.id"
                >{{ tag.name }} <star-filled v-if="tag.selected" /><star-outlined v-else />
              </a-menu-item>
            </a-sub-menu>
          </template>
        </template>
      </a-menu>
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
        height: 256px;
        width: 256px;
        object-fit: contain;
      }
    }
  }

  &.large-grid {
    :deep() {
      img,
      .preview-icon-wrap > [role='img'] {
        height: 512px;
        width: 512px;
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
