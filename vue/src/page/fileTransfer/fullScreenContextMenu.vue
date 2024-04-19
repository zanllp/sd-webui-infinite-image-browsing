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
  ArrowsAltOutlined,
  EllipsisOutlined
} from '@/icon'
import { t } from '@/i18n'
import { createReactiveQueue } from '@/util'
import { toRawFileUrl } from '@/util/file'
import ContextMenu from '@/components/ContextMenu.vue'
import { useWatchDocument } from 'vue3-ts-util'
import { useTagStore } from '@/store/useTagStore'
import { parse } from '@/util/stable-diffusion-image-metadata'

const global = useGlobalStore()

const tagStore = useTagStore()
const el = ref<HTMLElement>()
const props = defineProps<{
  file: FileNodeInfo
  idx: number
}>()
const selectedTag = computed(() => tagStore.tagMap.get(props.file.fullpath) ?? [])
const currImgResolution = ref('')
const q = createReactiveQueue()
const imageGenInfo = ref('')
const cleanImageGenInfo = computed(() => imageGenInfo.value.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;'))
const geninfoFrags = computed(() => cleanImageGenInfo.value.split('\n'))
const geninfoStruct = computed(() => parse(cleanImageGenInfo.value))

const geninfoStructNoPrompts = computed(() => {
  let p = parse(cleanImageGenInfo.value)
  delete p.prompt
  delete p.negativePrompt
  return p
})
const emit = defineEmits<{
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()


function unescapeHtml(string: string) {
  return `${string}`
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g,'<')
    .replace( /&gt;/g,'>')
    .replace( /&quot;/g,'"',)
    .replace( /&#39;/g,'\'');
}

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
const promptTabActivedKey = useLocalStorage('iib@fullScreenContextMenu.prompt-tab', 'structedData' as 'structedData' | 'sourceText')
const resizeHandle = ref<HTMLElement>()
const dragHandle = ref<HTMLElement>()
const dragInitParams = {
  left: 100,
  top: 100,
  width: 512,
  height: 384,
  expanded: true
}
const state = useLocalStorage('fullScreenContextMenu.vue-drag', dragInitParams)
if (state.value && (state.value.left < 0 || state.value.top < 0)) {
  state.value = { ...dragInitParams }
}

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

function spanWrap (text: string) {
  if (!text) {
    return ''
  }
  let result = ''
  const values = text.split(/[\n,]+/).map(v => v.trim()).filter(v => v)
  let parenthesisActive = false
  for (let i = 0; i < values.length; i++) {
    const trimmedValue = values[i]
    if (!parenthesisActive) parenthesisActive = trimmedValue.includes('(')
    const cssClass = parenthesisActive ? 'has-parentheses' : ''
    result += `<span class="${cssClass}">${trimmedValue}</span>`
    if (i < values.length - 1) {
      result += ','
    }
    if (parenthesisActive) parenthesisActive = !trimmedValue.includes(')')
  }
  return result
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

const copyPositivePrompt = () => {
  const neg = 'Negative prompt:'
  const text = imageGenInfo.value.includes(neg) ? imageGenInfo.value.split(neg)[0] : geninfoFrags.value[0] ?? ''
  copy2clipboardI18n(unescapeHtml(text.trim()))
}

</script>

<template>
  <div ref="el" class="full-screen-menu" @wheel.capture.stop :class="{ 'unset-size': !state.expanded }">
    <div class="container">
      <div class="action-bar">
        <div ref="dragHandle" class="icon" style="cursor: grab" :title="t('dragToMovePanel')">
          <DragOutlined />
        </div>
        <div class="icon" style="cursor: pointer" @click="state.expanded = !state.expanded"
          :title="t('clickToToggleMaximizeMinimize')">
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
                <a-menu-item key="copyPreviewUrl">{{ $t('copySourceFilePreviewLink') }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <AButton @click="emit('contextMenuClick', { key: 'download' } as MenuInfo, props.file, props.idx)">{{
            $t('download') }}</AButton>
          <a-button @click="copy2clipboardI18n(imageGenInfo)" v-if="imageGenInfo">{{
            $t('copyPrompt')
          }}</a-button>
          <a-button @click="copyPositivePrompt" v-if="imageGenInfo">{{
            $t('copyPositivePrompt')
          }}</a-button>
        </div>
      </div>
      <div class="gen-info" v-if="state.expanded">
        <div class="info-tags">
          <span class="info-tag" v-for="tag in baseInfoTags" :key="tag.name">
            <span class="name">
              {{ tag.name }}
            </span>
            <span class="value">
              {{ tag.val }}
            </span>
          </span>
        </div>
        <div class="tags-container" v-if="global.conf?.all_custom_tags">
          <div class="tag" v-for="tag in global.conf.all_custom_tags"
            @click="emit('contextMenuClick', { key: `toggle-tag-${tag.id}` } as any, file, idx)"
            :class="{ selected: selectedTag.some(v => v.id === tag.id) }" :key="tag.id"
            :style="{ '--tag-color': tagStore.getColor(tag.name) }">
            {{ tag.name }}
          </div>
        </div>
        <a-tabs v-model:activeKey="promptTabActivedKey">
          <a-tab-pane key="structedData" :tab="$t('structuredData')">
            <div>
              <template v-if="geninfoStruct.prompt">
                <br />
                <h3>Prompt</h3>
                <code v-html="spanWrap(geninfoStruct.prompt ?? '')"></code>
              </template>
              <template v-if="geninfoStruct.negativePrompt">
                <br />
                <h3>Negative Prompt</h3>
                <code v-html="spanWrap(geninfoStruct.negativePrompt ?? '')"></code>
              </template>
            </div>
            <template v-if="Object.keys(geninfoStructNoPrompts).length"> <br />
              <h3>Params</h3>
              <table>
                <tr v-for="txt, key in geninfoStructNoPrompts" :key="key" class="gen-info-frag">
                  <td style="font-weight: 600;text-transform: capitalize;">{{ key }}</td>
                  <td v-if="typeof txt == 'object'">
                    <code>{{ txt }}</code>
                  </td>
                  <td v-else>
                    {{ unescapeHtml(txt) }}
                  </td>
                </tr>
              </table>
            </template>
          </a-tab-pane>
          <a-tab-pane key="sourceText" :tab="$t('sourceText')">
            <code>{{ imageGenInfo }}</code>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>

    <div class="mouse-sensor" ref="resizeHandle" v-if="state.expanded" :title="t('dragToResizePanel')">
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
    margin: 4px 0;

    .tag {
      margin-right: 4px;
      margin-bottom: 4px;
      padding: 2px 16px;
      border-radius: 4px;
      display: inline-block;
      cursor: pointer;
      font-weight: bold;
      transition: .5s all ease;
      border: 2px solid var(--tag-color);
      color: var(--tag-color);
      background: var(--zp-primary-background);
      user-select: none;

      &.selected {
        background: var(--tag-color);
        color: white;
      }
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

    code {
      font-size: 0.9em;
      display: block;
      padding: 4px;
      background: var(--zp-primary-background);
      border-radius: 4px;
      margin-right: 20px;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.78em;

      :deep(span) {
        background: var(--zp-secondary-variant-background);
        color: var(--zp-primary);
        padding: 2px 4px;
        border-radius: 4px;
        margin-right: 4px;
      }

      :deep(.has-parentheses) {
        background: rgba(255, 100, 100, 0.14);
      }

      :deep(span:hover) {
        background: rgba(120, 0, 0, 0.15);
      }
    }

    table {
      font-size: 1em;
      border-radius: 4px;
      border-collapse: separate;
      margin-bottom: 3em;
    }

    table td {
      padding-right: 14px;
      padding-left: 4px;
      border-bottom: 1px solid var(--zp-secondary);
      border-collapse: collapse;
    }

    .info-tags {
      .info-tag {
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
    gap: 4px;

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
    }
  }
}
</style>
