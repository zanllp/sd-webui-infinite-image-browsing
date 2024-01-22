<script setup lang="ts">
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import ImgSliSide from './ImgSliSide.vue'
import PromptCompare from './PromptCompare.vue'
import { asyncComputed, useElementSize } from '@vueuse/core'
import { ref } from 'vue'
import { FileNodeInfo } from '@/api/files'
import { toRawFileUrl } from '@/util/file'
import { createImage } from '@/util'
import { ArrowDownOutlined } from '@/icon'

const props = defineProps<{
  left: FileNodeInfo,
  right: FileNodeInfo
  container?: 'drawer'
}>()
const percent = ref(50)
const onResize = ([{ size }]: { size: number }[]) => {
  percent.value = size
}

const wrapperEl = ref<HTMLDivElement>()
const { width } = useElementSize(wrapperEl)

const requestFullScreen = () => {
  wrapperEl.value?.requestFullscreen()
}
defineExpose({ requestFullScreen })


const maxEdge = asyncComputed(async () => {
  if (!props.left) {
    return 'width'
  }
  const l = await createImage(toRawFileUrl(props.left))
  const aspectRatio = l.width / l.height
  const clientAR = document.body.clientWidth / document.body.clientHeight
  return aspectRatio > clientAR ? 'width' : 'height'
})
</script>
<template>
  <div ref="wrapperEl" style="height:  100%;">
    <splitpanes class="default-theme" @resize="onResize">
      <pane v-if="left">
        <ImgSliSide side="left" :max-edge="maxEdge" :container-width="width" :percent="percent" :img="left" />
      </pane>
      <pane v-if="right">
        <ImgSliSide :max-edge="maxEdge" :percent="percent" :img="right" side="right" :container-width="width" />
      </pane>
    </splitpanes>
  </div>
  <div class="hint" v-if="container !== 'drawer'">
    <div class="hint-inline">
      <ArrowDownOutlined /> {{ $t('scrollDownToComparePrompt') }}
    </div>
  </div>
  <PromptCompare :lImg="left" :rImg="right"></PromptCompare>
</template>


<style lang="scss">
.hint {
  text-align: center;
  position: relative;
  z-index: 222;
  top: -48px;

  .hint-inline {
    display: inline-block;
    color: var(--main-text-color);
    margin: 0 auto;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: var(--zp-primary-background);
  }
}

.img-sli .default-theme {

  .splitpanes__splitter {
    background-color: #ccc;
    position: relative;
    width: 4px;
  }

  .splitpanes {
    background-color: #f8f8f8;
  }

}
</style>