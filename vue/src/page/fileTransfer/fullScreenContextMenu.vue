<script setup lang="ts">
import { getImageGenerationInfo } from '@/api'
import type { FileNodeInfo } from '@/api/files'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useLocalStorage } from '@vueuse/core'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { debounce, throttle, last } from 'lodash-es'
import { computed, watch } from 'vue'
import { ref } from 'vue'
import { copy2clipboardI18n, type Dict } from '@/util'
import { useResizeAndDrag } from './useResize'
import {
  DragOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ArrowsAltOutlined,
  EllipsisOutlined,
  fullscreen,
  SortAscendingOutlined,
  AppstoreOutlined
} from '@/icon'
import { t } from '@/i18n'
import { createReactiveQueue, unescapeHtml } from '@/util'
import ContextMenu from '@/components/ContextMenu.vue'
import { useWatchDocument } from 'vue3-ts-util'
import { useTagStore } from '@/store/useTagStore'
import { parse } from '@/util/stable-diffusion-image-metadata'
import { useFullscreenLayout } from '@/util/useFullscreenLayout'
import { useMouseInElement } from '@vueuse/core'
import { closeImageFullscreenPreview } from '@/util/imagePreviewOperation'
import { openAddNewTagModal } from '@/components/functionalCallableComp'
import { prefix } from '@/util/const'
// @ts-ignore
import * as Pinyin from 'jian-pinyin'
import { Tag } from '@/api/db'

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


const { isLeftRightLayout, lrLayoutInfoPanelWidth, lrMenuAlwaysOn } = useFullscreenLayout()
const lr = isLeftRightLayout
useResizeAndDrag(el, resizeHandle, dragHandle, {
  disbaled: lr,
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


// 处理在isOutside赋值前引用
const isInside = ref(false)

const { isOutside } = useMouseInElement(computed(() => {
  if (!lr.value || lrMenuAlwaysOn.value) {
    return null as any
  }

  const isIn = isInside.value as boolean
  return isIn ? el.value : last(document.querySelectorAll('.iib-tab-edge-trigger'))
}))


watch(isOutside, throttle((v) => {
  isInside.value = !v
}, 300))


function getParNode (p: any) {
  return p.parentNode as HTMLDivElement
}

function spanWrap (text: string) {
  if (!text) {
    return ''
  }
  const frags = [] as string[]
  const specBreakTag = 'BREAK'
  const values = text.replace(/&gt;\s/g, '> ,').replace(/\sBREAK\s/g, ',' + specBreakTag + ',').split(/[\n,]+/).map(v => v.trim()).filter(v => v)
  let parenthesisActive = false
  for (let i = 0; i < values.length; i++) {
    if (values[i] === specBreakTag) {
      frags.push('<br><span class="tag" style="color:var(--zp-secondary)">BREAK</span><br>')
      continue

    }
    const trimmedValue = values[i]
    if (!parenthesisActive) parenthesisActive = trimmedValue.includes('(')
    const classList = ['tag']
    if (parenthesisActive) classList.push('has-parentheses')
    if (trimmedValue.length < 32) classList.push('short-tag')

    frags.push(`<span class="${classList.join(' ')}">${trimmedValue}</span>`)
    if (parenthesisActive) parenthesisActive = !trimmedValue.includes(')')
  }
  return frags.join(global.showCommaInInfoPanel ? ',' : ' ')
}

useWatchDocument('load', e => {
  const el = e.target as HTMLImageElement
  if (el.className === 'ant-image-preview-img') {
    currImgResolution.value = `${el.naturalWidth} x ${el.naturalHeight}`
  }
}, { capture: true })

const baseInfoTags = computed(() => {
  const tags: { val: string, name: string }[] = [{ name: t('fileSize'), val: props.file.size }]
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
const requestFullscreen = () => document.body.requestFullscreen()

const copy = (val: any) => {
  copy2clipboardI18n(typeof val === 'object' ? JSON.stringify(val, null, 4) : val)
}



const onKeydown = (e: KeyboardEvent) => {
  if (e.key.startsWith('Arrow')) {
    e.stopPropagation()
    e.preventDefault()
    document.dispatchEvent(new KeyboardEvent('keydown', e))
  }
  else if (e.key === 'Escape') {
    // 判断是不是全屏如果是退出
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }

  }
}

useWatchDocument('dblclick', e => {
  if ((e.target as HTMLDivElement)?.className === 'ant-image-preview-img') {
    closeImageFullscreenPreview()
  }
})


const showFullContent = computed(() => lr.value || state.value.expanded)
const showFullPath = useLocalStorage(prefix + 'contextShowFullPath', false)
const fileTagValue = computed(() => showFullPath.value ? props.file.fullpath : props.file.name)

const tagA2ZClassify = useLocalStorage(prefix + 'tagA2ZClassify', false)
const tagAlphabet = computed(() => {
  const tags = global.conf?.all_custom_tags.map(v => {
    const char = v.display_name?.[0] || v.name?.[0]
    return {
      char,
      ...v
    }
  }).reduce((p: Dict<Tag[]>, c: Tag & { char: string }) => {
    let pos = '#'
    if (/[a-z]/i.test(c.char)) {
      pos = c.char.toUpperCase()
    } else if (/[\u4e00-\u9fa5]/.test(c.char)) {
      try {
        pos = /^\[?(\w)/.exec((Pinyin.getSpell(c.char) + ''))?.[1] ?? '#'
        // eslint-disable-next-line no-empty
      } catch (error) {
        console.log('err', error)
      }
    }
    pos = pos.toUpperCase()
    p[pos] ||= []
    p[pos].push(c)
    return p
  }, {} as Dict<Tag[]>)
  const res = Object.entries(tags ?? {}).sort((a, b) => a[0].charCodeAt(0) - b[0].charCodeAt(0))
  return res
})

</script>

<template>
  <div ref="el" class="full-screen-menu" @wheel.capture.stop @keydown.capture="onKeydown"
    :class="{ 'unset-size': !state.expanded, lr, 'always-on': lrMenuAlwaysOn, 'mouse-in': isInside }">

    <div v-if="lr">
    </div>
    <div class="container">
      <div class="action-bar">
        <div v-if="!lr" ref="dragHandle" class="icon" style="cursor: grab" :title="t('dragToMovePanel')">
          <DragOutlined />
        </div>

        <div v-if="!lr" class="icon" style="cursor: pointer" @click="state.expanded = !state.expanded"
          :title="t('clickToToggleMaximizeMinimize')">
          <FullscreenExitOutlined v-if="showFullContent" />
          <FullscreenOutlined v-else />
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; cursor: grab" class="icon"
          :title="t('fullscreenview')" @click="requestFullscreen">
          <img :src="fullscreen" style="width: 21px;height: 21px;padding-bottom: 2px;" alt="">
        </div>
        <a-dropdown :get-popup-container="getParNode">
          <div class="icon" style="cursor: pointer" v-if="!state.expanded">
            <ellipsis-outlined />
          </div>
          <template #overlay>
            <context-menu :file="file" :idx="idx" :selected-tag="selectedTag"
              @context-menu-click="(e, f, i) => emit('contextMenuClick', e, f, i)" />
          </template>
        </a-dropdown>
        <div flex-placeholder v-if="showFullContent" />
        <div v-if="showFullContent" class="action-bar">

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
                <a-sub-menu key="copy2target" :title="$t('copyTo')">
                  <a-menu-item v-for="path in global.quickMovePaths" :key="`copy-to-${path.dir}`">{{ path.zh }}
                  </a-menu-item>
                </a-sub-menu>
                <a-sub-menu key="move2target" :title="$t('moveTo')">
                  <a-menu-item v-for="path in global.quickMovePaths" :key="`move-to-${path.dir}`">{{ path.zh }}
                  </a-menu-item>
                </a-sub-menu>
                <a-menu-divider />
                <a-menu-item key="deleteFiles">
                  {{ $t('deleteSelected') }}
                </a-menu-item>
                <a-menu-item key="previewInNewWindow">{{ $t('previewInNewWindow') }}</a-menu-item>
                <a-menu-item key="copyPreviewUrl">{{ $t('copySourceFilePreviewLink') }}</a-menu-item>
                <a-menu-item key="copyFilePath">{{ $t('copyFilePath') }}</a-menu-item>
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
      <div class="gen-info" v-if="showFullContent">
        <div class="info-tags">
          <span class="info-tag">
            <span class="name">
              {{ $t('fileName') }}
            </span>
            <span class="value" :title="fileTagValue" @dblclick="copy2clipboardI18n(fileTagValue)">
              {{ fileTagValue }}
            </span>
            <span :style="{ margin: '0 8px', cursor: 'pointer' }" title="Click to expand full path"
              @click="showFullPath = !showFullPath">
              <EllipsisOutlined />
            </span>
          </span>
          <span class="info-tag" v-for="tag in baseInfoTags" :key="tag.name">
            <span class="name">
              {{ tag.name }}
            </span>
            <span class="value" :title="tag.val" @dblclick="copy2clipboardI18n(tag.val)">
              {{ tag.val }}
            </span>
          </span>
        </div>
        <div class="tags-container" v-if="global.conf?.all_custom_tags">
          <div class="sort-tag-switch" @click="tagA2ZClassify = !tagA2ZClassify">
            <SortAscendingOutlined v-if="!tagA2ZClassify" />
            <AppstoreOutlined v-else />
          </div>
          <div class="tag" @click="openAddNewTagModal" :style="{ '--tag-color': 'var(--zp-luminous)' }">+ {{ $t('add')
            }}
          </div>
          <template v-if="tagA2ZClassify">
            <div v-for="([char, item]) in tagAlphabet" :key="char" class="tag-alpha-item">
              <h4 style="display: inline-block; width: 32px;">{{ char }} : </h4>
              <div><div class="tag" v-for="tag in item"
                @click="emit('contextMenuClick', { key: `toggle-tag-${tag.id}` } as any, file, idx)"
                :class="{ selected: selectedTag.some(v => v.id === tag.id) }" :key="tag.id"
                :style="{ '--tag-color': tagStore.getColor(tag) }">
                {{ tag.name }}
              </div></div>
            </div>
          </template>
          <template v-else>

            <div class="tag" v-for="tag in global.conf.all_custom_tags"
              @click="emit('contextMenuClick', { key: `toggle-tag-${tag.id}` } as any, file, idx)"
              :class="{ selected: selectedTag.some(v => v.id === tag.id) }" :key="tag.id"
              :style="{ '--tag-color': tagStore.getColor(tag) }">
              {{ tag.name }}
            </div>
          </template>
        </div>
        <div class="lr-layout-control">
          <div class="ctrl-item">
            {{ $t('experimentalLRLayout') }}： <a-switch v-model:checked="lr" size="small" />
          </div>
          <template v-if="lr">

            <div class="ctrl-item">
              {{ $t('width') }}: <a-input-number v-model:value="lrLayoutInfoPanelWidth" style="width:64px" :step="16"
                :min="128" :max="1024" />
            </div>
            <a-tooltip :title="$t('alwaysOnTooltipInfo')">
              <div class="ctrl-item">
                {{ $t('alwaysOn') }}： <a-switch v-model:checked="lrMenuAlwaysOn" size="small" />
              </div>
            </a-tooltip>
          </template>
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
                  <td style="cursor: pointer;" v-if="typeof txt == 'object'" @dblclick="copy(txt)">
                    <code>{{ txt }}</code>
                  </td>
                  <td v-else style="cursor: pointer;" @dblclick="copy(unescapeHtml(txt))">
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

    <div class="mouse-sensor" ref="resizeHandle" v-if="state.expanded && !lr" :title="t('dragToResizePanel')">
      <ArrowsAltOutlined />
    </div>
  </div>
</template>

<style scoped lang="scss">
.full-screen-menu {
  position: fixed;
  z-index: 9999;
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

      :deep() {
        .short-tag {
          word-break: break-all;
          white-space: nowrap;
        }

        span.tag {

          background: var(--zp-secondary-variant-background);
          color: var(--zp-primary);
          padding: 2px 4px;
          border-radius: 6px;
          margin-right: 6px;
          margin-top: 4px;
          line-height: 1.3em;
          display: inline-block;
        }

        .has-parentheses.tag {
          background: rgba(255, 100, 100, 0.14);
        }

        span.tag:hover {
          background: rgba(120, 0, 0, 0.15);
        }
      }
    }

    table {
      font-size: 1em;
      border-radius: 4px;
      border-collapse: separate;
      margin-bottom: 3em;

      tr td:first-child {
        white-space: nowrap;
      }
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
        border-bottom-right-radius: 4px;
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

.full-screen-menu.lr {
  top: v-bind("lrMenuAlwaysOn ? 0 : '46px'") !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 100vw !important;
  height: unset !important;
  width: v-bind("lrLayoutInfoPanelWidth + 'px'") !important;
  transition: left ease 0.3s;

  &.always-on,
  &.mouse-in {
    left: v-bind("`calc(100vw - ${lrLayoutInfoPanelWidth}px)`") !important;
  }
}
.tag-alpha-item {
  display: flex;
  h4 {
    width: 32px;
    flex-shrink: 0;
  }
  margin-top: 4px;
}
.sort-tag-switch {
  display: inline-block;
  padding-right: 16px;
  padding-left: 8px;
  cursor: pointer;
  user-select: none;

  span {
    transition: all ease .3s;
    transform: scale(1.2);
  }

  &:hover span {
    transform: scale(1.3);
  }
}

.lr-layout-control {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 8px;
  flex-wrap: wrap;
  border-radius: 2px;
  border-left: 3px solid var(--zp-luminous);
  background-color: var(--zp-secondary-background);

  .ctrl-item {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: nowrap;
  }
}
</style>
