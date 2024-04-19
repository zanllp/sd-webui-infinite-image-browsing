<script setup lang="ts">
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Splitpanes, Pane } from 'splitpanes'
import { FileNodeInfo } from '@/api/files'
import { getImageGenerationInfo } from '@/api'
import { watch, ref } from 'vue'
import { createReactiveQueue } from '@/util'
import { parse } from '@/util/stable-diffusion-image-metadata'
import { useGlobalStore } from '@/store/useGlobalStore'

const props = defineProps<{
  lImg: FileNodeInfo,
  rImg: FileNodeInfo
}>()

const q = createReactiveQueue()
const g = useGlobalStore()
const lImgInfo = ref('')
const rImgInfo = ref('')
let seenKeys = []

function preprocessGenerationInfo (info: any) {
  let formatted = ''
  let parsed = parse(info)

  formatted += '--- PROMPT --- \r\n'
  formatted += parsed.prompt?.replace(/\r\n/g, '') + '\r\n\r\n'
  formatted += '--- NEGATIVE PROMPT --- \r\n'
  formatted += parsed.negativePrompt ? parsed.negativePrompt.replace(/\n/g, '') + '\r\n\r\n' : '\r\n\r\n'

  //add rest of info properties line by line
  //collect seen keys in global array and add linebreak if known key is missing
  formatted += '--- PARAMS ---\r\n'
  for (const [key, value] of Object.entries(parsed)) {
    if (key == 'prompt' || key == 'negativePrompt') {
      continue
    }
    formatted += key + ': ' + value + '\r\n'
    seenKeys.push(key)
  }

  return formatted
}

watch(
  () => props?.lImg?.fullpath,
  async (path) => {
    if (!path) {
      return
    }
    q.tasks.forEach((v) => v.cancel())
    q.pushAction(() => getImageGenerationInfo(path)).res.then((v) => {
      lImgInfo.value = preprocessGenerationInfo(v)
    })
    q.pushAction(() => getImageGenerationInfo(props.rImg.fullpath)).res.then((v) => {
      rImgInfo.value = preprocessGenerationInfo(v)
    })
  },
  { immediate: true }
)

</script>

<template>
    <VueDiff class="diff" mode="split" :theme="g.computedTheme" language="plaintext" :prev="lImgInfo" :current="rImgInfo">
    </VueDiff>
</template>

<style lang="scss">
.diff {
    transform: scale(1);
    opacity: 1;
    backdrop-filter: blur(5px);
    transition: top 0.2s ease-in-out;
}


.diff code {
    font-size: 12px;
    line-height: 14px;
    /*color:white !important;*/
    font-family: "Fira Code", "Source Code Pro", monospace;
}

.vue-diff-viewer .vue-diff-row .vue-diff-cell-removed span.modified {
    background-color: #ff000059 !important;
}

.vue-diff-viewer .vue-diff-row .vue-diff-cell-added span.modified {
    background-color: #00ff0059 !important;
}
</style>