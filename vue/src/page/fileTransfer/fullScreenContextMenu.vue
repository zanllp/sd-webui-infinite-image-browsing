<script setup lang="ts">
import { getImageGenerationInfo } from '@/api'
import type { FileNodeInfo } from '@/api/files'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useLocalStorage } from '@vueuse/core'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { debounce } from 'lodash-es'
import { computed, watch } from 'vue'
import { ref } from 'vue'
import { copy2clipboardI18n } from '@/util'
import { useResizeAndDrag } from './useResize'
import {
  DragOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  StarFilled,
  StarOutlined,
  ArrowsAltOutlined,
  EllipsisOutlined
} from '@/icon'
import { t } from '@/i18n'
import { type Tag } from '@/api/db'
import { createReactiveQueue } from '@/util'
import { toRawFileUrl } from '@/util/file'
import ContextMenu from '@/components/ContextMenu.vue'
import { useWatchDocument } from 'vue3-ts-util'
import { useTagStore } from '@/store/useTagStore'

const global = useGlobalStore()
const tagStore = useTagStore()
const el = ref<HTMLElement>()
const props = defineProps<{
  file: FileNodeInfo
  idx: number
}>()
const selectedTag = computed(() => tagStore.tagMap.get(props.file.fullpath) ?? [])
const tags = computed(() => {
  return (global.conf?.all_custom_tags ?? []).reduce((p, c) => {
    return [...p, { ...c, selected: !!selectedTag.value.find((v) => v.id === c.id) }]
  }, [] as (Tag & { selected: boolean })[])
})
const currImgResolution = ref('')
const q = createReactiveQueue()
const imageGenInfo = ref('')
const emit = defineEmits<{
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()

watch(
  () => props?.file?.fullpath,
  async (path) => {
    if (!path) {
      return
    }
    q.tasks.forEach((v) => v.cancel())
    q.pushAction(() => getImageGenerationInfo(path)).res.then((v) => {
      imageGenInfo.value = v
    })
  },
  { immediate: true }
)

const resizeHandle = ref<HTMLElement>()
const dragHandle = ref<HTMLElement>()
const state = useLocalStorage('fullScreenContextMenu.vue-drag', {
  left: 100,
  top: 100,
  width: 512,
  height: 384,
  expanded: true
})
useResizeAndDrag(el, resizeHandle, dragHandle, {
  ...state.value,
  onDrag: debounce(function (left, top) {
    state.value = {
      ...state.value,
      left,
      top
    }
  }, 300),
  onResize: debounce(function (width, height) {
    state.value = {
      ...state.value,
      width,
      height
    }
  }, 300)
})

function getParNode (p: any) {
  return p.parentNode as HTMLDivElement
}

useWatchDocument('load', e => {
  const el = e.target as HTMLImageElement
  if (el.className === 'ant-image-preview-img') {
    currImgResolution.value = `${el.naturalWidth} x ${el.naturalHeight}`
  }
}, { capture: true })

const baseInfoTags = computed(() => {
  const tags: { val: string, name: string }[] = [{ name: t('fileName'), val: props.file.name }, { name: t('fileSize'), val: props.file.size }]
  if (currImgResolution.value) {
    tags.push({ name: t('resolution'), val: currImgResolution.value })
  }
  return tags
})

</script>

<template>
  <div ref="el" class="full-screen-menu" @wheel.capture.stop :class="{ 'unset-size': !state.expanded }">
    <div class="container">
      <div class="action-bar">
        <div ref="dragHandle" class="icon" style="cursor: grab">
          <DragOutlined />
        </div>
        <div class="icon" style="cursor: pointer" @click="state.expanded = !state.expanded">
          <FullscreenExitOutlined v-if="state.expanded" />
          <FullscreenOutlined v-else />
        </div>
        <a-dropdown :get-popup-container="getParNode">
          <div class="icon" style="cursor: pointer" v-if="!state.expanded">
            <ellipsis-outlined />
          </div>
          <template #overlay>
            <context-menu :file="file" :idx="idx" :selected-tag="selectedTag"
              :disable-delete="toRawFileUrl(file) === global.fullscreenPreviewInitialUrl"
              @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)" />
          </template>
        </a-dropdown>
        <div flex-placeholder v-if="state.expanded" />
        <div v-if="state.expanded" class="action-bar">
          <a-dropdown :trigger="['hover']" :get-popup-container="getParNode">
            <a-button>{{ $t('toggleTag') }}</a-button>
            <template #overlay>
              <a-menu @click="emit('contextMenuClick', $event, file, idx)">
                <a-menu-item v-for="tag in tags" :key="`toggle-tag-${tag.id}`">{{ tag.name }} <star-filled
                    v-if="tag.selected" /><star-outlined v-else />
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-dropdown :trigger="['hover']" :get-popup-container="getParNode">
            <a-button>{{ t('openContextMenu') }}</a-button>
            <template #overlay>
              <a-menu @click="emit('contextMenuClick', $event, file, idx)">
                <template v-if="global.conf?.launch_mode !== 'server'">
                  <a-menu-item key="send2txt2img">{{ $t('sendToTxt2img') }}</a-menu-item>
                  <a-menu-item key="send2img2img">{{ $t('sendToImg2img') }}</a-menu-item>
                  <a-menu-item key="send2inpaint">{{ $t('sendToInpaint') }}</a-menu-item>
                  <a-menu-item key="send2extras">{{ $t('sendToExtraFeatures') }}</a-menu-item>
                  <a-sub-menu key="sendToThirdPartyExtension" :title="$t('sendToThirdPartyExtension')">
                    <a-menu-item key="send2controlnet-txt2img">ControlNet - {{ $t('t2i') }}</a-menu-item>
                    <a-menu-item key="send2controlnet-img2img">ControlNet - {{ $t('i2i') }}</a-menu-item>
                    <a-menu-item key="send2outpaint">openOutpaint</a-menu-item>
                  </a-sub-menu>
                </template>
                <a-menu-item key="send2BatchDownload">{{ $t('sendToBatchDownload') }}</a-menu-item>
                <a-menu-item key="send2savedDir">{{ $t('send2savedDir') }}</a-menu-item>
                <a-menu-item key="deleteFiles" :disabled="toRawFileUrl(file) === global.fullscreenPreviewInitialUrl">
                  {{ $t('deleteSelected') }}
                </a-menu-item>
                <a-menu-item key="previewInNewWindow">{{ $t('previewInNewWindow') }}</a-menu-item>
                <a-menu-item key="download">{{ $t('download') }}</a-menu-item>
                <a-menu-item key="copyPreviewUrl">{{ $t('copySourceFilePreviewLink') }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-button @click="copy2clipboardI18n(imageGenInfo)">{{
            $t('copyPrompt')
          }}</a-button>
        </div>
      </div>
      <div class="gen-info" v-if="state.expanded">
        <div class="tags">
          <span class="tag" v-for="tag in baseInfoTags" :key="tag.name">
            <span class="name">
              {{ tag.name }}
            </span>
            <span class="value">
              {{ tag.val }}
            </span>
          </span>
        </div>
        <div class="tags-container" v-if="selectedTag">
          <a-tag v-for="tag in selectedTag" :key="tag.id" :color="tagStore.getColor(tag.name)">
            {{ tag.name }}
          </a-tag>
        </div>
        {{ imageGenInfo }}
      </div>
    </div>

    <div class="mouse-sensor" ref="resizeHandle" v-if="state.expanded">
      <ArrowsAltOutlined />
    </div>
  </div>
</template>

<style scoped lang="scss">
.full-screen-menu {
  position: fixed;
  z-index: 99999;
  background: var(--zp-primary-background);
  padding: 8px 16px;
  box-shadow: 0px 0px 4px var(--zp-secondary);
  border-radius: 4px;

  .tags-container {
    &>* {
      margin-right: 4px;
      font-size: 14px;
      line-height: 1.6;
    }
  }

  .container {
    height: 100%;
    display: flex;
    overflow: hidden;
    flex-direction: column;
  }

  .gen-info {
    padding-top: 8px;
    flex: 1;
    word-break: break-all;
    white-space: pre-line;
    overflow: auto;
    z-index: 1;
    padding-top: 4px;
    position: relative;

    .tags {
      .tag {
        display: inline-block;
        overflow: hidden;
        border-radius: 4px;
        margin-right: 8px;
        border: 2px solid var(--zp-primary);
      }


      .name {
        background-color: var(--zp-primary);
        color: var(--zp-primary-background);
        padding: 4px;
      }

      .value {
        padding: 4px;
      }

    }
  }

  &.unset-size {
    width: unset !important;
    height: unset !important;
  }

  .mouse-sensor {
    position: absolute;
    bottom: 0;
    right: 0;
    transform: rotate(90deg);
    cursor: se-resize;
    z-index: 1;
    background: var(--zp-primary-background);
    border-radius: 2px;

    &>* {
      font-size: 18px;
      padding: 4px;
    }
  }

  .action-bar {
    display: flex;
    align-items: center;
    user-select: none;

    .icon {
      font-size: 1.5em;
      padding: 2px 4px;
      border-radius: 4px;

      &:hover {
        background: var(--zp-secondary-variant-background);
      }
    }

    &>* {
      flex-wrap: wrap;

      &:not(:last-child) {
        margin-right: 8px;
      }
    }
  }
}
</style>
