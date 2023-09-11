<script setup lang="ts">
import { FileOutlined, FolderOpenOutlined, EllipsisOutlined, HeartOutlined, HeartFilled } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { fallbackImage, ok } from 'vue3-ts-util'
import type { FileNodeInfo } from '@/api/files'
import { isImageFile, isVideoFile } from '@/util'
import { toImageThumbnailUrl, toRawFileUrl } from '@/util/file'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { computed } from 'vue'
import ContextMenu from './ContextMenu.vue'
import { useTagStore } from '@/store/useTagStore'
import { CloseCircleOutlined, StarFilled, StarOutlined, PlayCircleFilled } from '@/icon'
import { Tag } from '@/api/db'
import { openVideoModal } from './functionalCallableComp'

const global = useGlobalStore()
const tagStore = useTagStore()
const props = withDefaults(
  defineProps<{
    file: FileNodeInfo
    idx: number
    selected?: boolean
    showMenuIdx?: number
    cellWidth: number
    fullScreenPreviewImageUrl?: string
    enableRightClickMenu?: boolean,
    enableCloseIcon?: boolean
  }>(),
  { selected: false, enableRightClickMenu: true, enableCloseIcon: false }
)

const emit = defineEmits<{
  'update:showMenuIdx': [v: number],
  'fileItemClick': [event: MouseEvent, file: FileNodeInfo, idx: number],
  'dragstart': [event: DragEvent, idx: number],
  'dragend': [event: DragEvent, idx: number],
  'previewVisibleChange': [value: boolean, last: boolean],
  'contextMenuClick': [e: MenuInfo, file: FileNodeInfo, idx: number],
  'close-icon-click': []
}>()

const customTags = computed(() => {
  return tagStore.tagMap.get(props.file.fullpath) ?? []
})

const imageSrc = computed(() => {
  const r = global.gridThumbnailResolution
  return global.enableThumbnail ? toImageThumbnailUrl(props.file, [r, r].join('x')) : toRawFileUrl(props.file)
})

const tags = computed(() => {
  return (global.conf?.all_custom_tags ?? []).reduce((p, c) => {
    return [...p, { ...c, selected: !!customTags.value.find((v) => v.id === c.id) }]
  }, [] as (Tag & { selected: boolean })[])
})

const likeTag = computed(() => tags.value.find(v => v.type === 'custom' && v.name === 'like'))

const taggleLikeTag = () => {
  ok(likeTag.value)
  emit('contextMenuClick', { key: `toggle-tag-${likeTag.value.id}` } as MenuInfo, props.file, props.idx)
}

</script>
<template>
  <a-dropdown :trigger="['contextmenu']" :visible="!global.longPressOpenContextMenu ? undefined : typeof idx === 'number' && showMenuIdx === idx
    " @update:visible="(v: boolean) => typeof idx === 'number' && emit('update:showMenuIdx', v ? idx : -1)">
    <li class="file file-item-trigger grid" :class="{
      clickable: file.type === 'dir',
      selected
    }" :data-idx="idx" :key="file.name" draggable="true" @dragstart="emit('dragstart', $event, idx)"
      @dragend="emit('dragend', $event, idx)" @click.capture="emit('fileItemClick', $event, file, idx)">

      <div>
        <div class="close-icon" v-if="enableCloseIcon" @click="emit('close-icon-click')">
          <close-circle-outlined />
        </div>
        <div class="more" v-if="enableRightClickMenu">
          <a-dropdown>
            <div class="float-btn-wrap">
              <ellipsis-outlined />
            </div>
            <template #overlay>
              <context-menu :file="file" :idx="idx" :selected-tag="customTags"
                @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)" />
            </template>
          </a-dropdown>
          <a-dropdown v-if="file.type === 'file'">
            <div class="float-btn-wrap" :class="{ 'like-selected': likeTag?.selected }" @click="taggleLikeTag">
              <HeartFilled v-if="likeTag?.selected" />
              <HeartOutlined v-else />
            </div>
            <template #overlay>
              <a-menu @click="emit('contextMenuClick', $event, file, idx)" v-if="tags.length > 1">
                <a-menu-item v-for="tag in tags" :key="`toggle-tag-${tag.id}`">{{ tag.name }}
                  <star-filled v-if="tag.selected" /><star-outlined v-else />
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <!-- :key="fullScreenPreviewImageUrl ? undefined : file.fullpath" 
          这么复杂是因为再全屏查看时可能因为直接删除导致fullpath变化，然后整个预览直接退出-->
        <div :key="file.fullpath" :class="`idx-${idx} item-content`" v-if="isImageFile(file.name)">

          <a-image :src="imageSrc" :fallback="fallbackImage" :preview="{
            src: fullScreenPreviewImageUrl,
            onVisibleChange: (v: boolean, lv: boolean) => emit('previewVisibleChange', v, lv)
          }" />
          <div class="tags-container" v-if="customTags && cellWidth > 128">
            <a-tag v-for="tag in customTags" :key="tag.id" :color="tagStore.getColor(tag.name)">
              {{ tag.name }}
            </a-tag>
          </div>
        </div>
        <div :class="`idx-${idx} item-content video`" v-else-if="isVideoFile(file.name)" @click="openVideoModal(file)">
          <div class="play-icon">
            <PlayCircleFilled />
          </div>
          <div class="tags-container" v-if="customTags && cellWidth > 128">
            <a-tag v-for="tag in customTags" :key="tag.id" :color="tagStore.getColor(tag.name)">
              {{ tag.name }}
            </a-tag>
          </div>
        </div>
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
      <context-menu :file="file" :idx="idx" :selected-tag="customTags" v-if="enableRightClickMenu"
        @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)" />
    </template>
  </a-dropdown>
</template>
<style lang="scss" scoped>
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.item-content {
  position: relative;

  &.video {
    background-color: var(--zp-border);
    border-radius: 8px;
    overflow: hidden;
    width: v-bind('$props.cellWidth + "px"');
    height: v-bind('$props.cellWidth + "px"');
    cursor: pointer;
  }

  .play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 3em;
    transform: translate(-50%, -50%);
  }

  .tags-container {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    width: calc(100% - 16px);
    flex-wrap: wrap-reverse;
    flex-direction: row-reverse;

    &>* {
      margin: 0 0 4px 4px;
      font-size: 14px;
      line-height: 1.6;
    }
  }
}



.close-icon {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%) scale(1.5);
  cursor: pointer;
  z-index: 100;
  border-radius: 100%;
  overflow: hidden;
  line-height: 1;
  background-color: var(--zp-primary-background);
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

  &:hover .more {
    opacity: 1;
  }

  .more {
    opacity: 0;
    transition: all 0.3s ease;
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    line-height: 1em;

    .float-btn-wrap {
      font-size: 1.5em;
      cursor: pointer;
      font-size: 500;
      padding: 4px;
      border-radius: 100vh;
      color: white;
      background: var(--zp-icon-bg);

      margin-bottom: 4px;

      &.like-selected {
        color: rgb(223, 5, 5);
      }
    }
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
      .preview-icon-wrap>[role='img'] {
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
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>
