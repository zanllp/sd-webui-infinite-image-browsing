<script setup lang="ts">
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import ImgSliSide from './ImgSliSide.vue'
import { asyncComputed, useElementSize } from '@vueuse/core'
import { ref } from 'vue'
import { FileNodeInfo } from '@/api/files'
import { toRawFileUrl } from '@/util/file'
import { createImage } from '@/util'

const props = defineProps<{
  left: FileNodeInfo,
  right: FileNodeInfo
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
  <div ref="wrapperEl" style="height: 100%;">
    <splitpanes class="default-theme" @resize="onResize">
      <pane v-if="left">
        <ImgSliSide side="left" :max-edge="maxEdge" :container-width="width" :percent="percent" :img="left" />
      </pane>
      <pane v-if="right">
        <ImgSliSide :max-edge="maxEdge" :percent="percent" :img="right" side="right" :container-width="width" />
      </pane>
    </splitpanes>
  </div>
</template>


<style lang="scss">
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