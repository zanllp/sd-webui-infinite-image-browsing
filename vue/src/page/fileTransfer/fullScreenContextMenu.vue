<script setup lang="ts">
import { getImageGenerationInfo } from '@/api'
import type { FileNodeInfo } from '@/api/files'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useLocalStorage } from '@vueuse/core'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { debounce } from 'lodash-es'
import { reactive, watch } from 'vue'
import { ref } from 'vue'
import { FetchQueue, copy2clipboard } from 'vue3-ts-util'
import { useResizeAndDrag } from './useResize'
import { DragOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@/icon'
import { t } from '@/i18n'

const global = useGlobalStore()
const el = ref<HTMLElement>()
const props = defineProps<{
  file: FileNodeInfo
  idx: number
}>()

const q = reactive(new FetchQueue())
const imageGenInfo = ref('')
const emit = defineEmits<{
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()

watch(
  () => props.file.fullpath,
  async (path) => {
    q.tasks.forEach((v) => v.cancel())
    imageGenInfo.value = await q.pushAction(() => getImageGenerationInfo(path)).res
  }, { immediate: true }
)
const resizeHandle = ref<HTMLElement>()
const dragHandle = ref<HTMLElement>()
const state = useLocalStorage('fullScreenContextMenu.vue-drag', { left: 100, top: 100, width: 512, height: 384, expanded: true })
useResizeAndDrag(el, resizeHandle, dragHandle, {
  ...state.value,
  onDrag: debounce(function (left, top) {
    state.value = {
      ...state.value, left, top,
    }
  }, 300),
  onResize: debounce(function (width, height) {
    state.value = {
      ...state.value, width, height,
    }
  }, 300),
})
</script>

<template>
  <div ref="el" class="full-screen-menu" @wheel.capture.stop  :class="{ 'unset-size': !state.expanded }">
    <div class="container">
      <div class="actoion-bar">
      <template v-if="state.expanded">
        <a-dropdown :trigger="['hover']" style="z-index: 99999;" :get-popup-container="p => p.parentNode as HTMLDivElement">
          <a-button>{{ t('openContextMenu') }}</a-button>
          <template #overlay>
            <a-menu @click="emit('contextMenuClick', $event, file, idx)" style="z-index: 99999;">
              <a-menu-item key="send2txt2img">{{ $t('sendToTxt2img') }}</a-menu-item>
              <a-menu-item key="send2img2img">{{ $t('sendToImg2img') }}</a-menu-item>
              <a-menu-item key="send2inpaint">{{ $t('sendToInpaint') }}</a-menu-item>
              <a-menu-item key="send2extras">{{ $t('sendToExtraFeatures') }}</a-menu-item>
              <a-menu-item key="send2savedDir">{{ $t('send2savedDir') }}</a-menu-item>
              <a-sub-menu key="add-custom-tag" :title="$t('addCustomTag')">
                <a-menu-item v-for="tag in global.conf?.all_custom_tags ?? []" :key="tag.id">{{
                  tag.name
                }}</a-menu-item>
              </a-sub-menu>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button @click="copy2clipboard(imageGenInfo, 'copied')">{{ $t('copyPrompt') }}</a-button>
        <div flex-placeholder></div>
      </template>
        <div class="icon" style="cursor: pointer; "  @click="state.expanded = !state.expanded">
          <FullscreenExitOutlined v-if="state.expanded"/>
          <FullscreenOutlined v-else/>
        </div>
        <div ref="dragHandle" class="icon" style="cursor: grab;"  >
          <DragOutlined />
        </div>
      </div>
      <div class="gen-info" v-if="state.expanded">
        {{ imageGenInfo }}
      </div>
    </div>

    <div class="mouse-sensor"  ref="resizeHandle" v-if="state.expanded"/>
  </div>
</template>

<style scoped lang="scss">
.full-screen-menu {
  position: fixed;
  z-index: 99999;
  background: var(--zp-primary-background);
  padding: 16px;
  box-shadow: 0px 0px 4px var(--zp-secondary);
  border-radius: 4px;

  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .gen-info {
    padding-top: 8px;
    flex: 1;
    word-break: break-all;
    white-space: pre-line;
    overflow: auto;
    z-index: 1;
    position: relative;
  }

  &.unset-size {
    width: unset !important;
    height: unset !important;
  }


  .mouse-sensor {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    background-color: var(--zp-secondary);
    cursor: se-resize;
  }

  .actoion-bar {
    display: flex;
    align-items: center;

    .icon {
      font-size: 1.5em;
    }

    &>* {
      margin-right: 8px;
    }
  }
}
</style>
