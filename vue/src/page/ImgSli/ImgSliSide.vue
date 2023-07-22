<script setup lang="ts">
import { toRawFileUrl } from '@/util/file'
import { computed } from 'vue'
import { FileNodeInfo } from '@/api/files'
const props = defineProps<{ side: 'left' | 'right', containerWidth: number, img: FileNodeInfo, maxEdge: 'width' | 'height', percent: number }>()
const style = computed(() => {
  let x = ''
  const handlerWidth = 4
  const width = props.containerWidth
  if (props.side === 'left') {
    x = `calc(50% - ${(props.percent - 50) / 100 * width}px)`
  } else {
    x = `calc(-50% - ${(props.percent - 50) / 100 * width + handlerWidth}px)`
  }
  return `${props.maxEdge === 'width' ? 'width:100%' : 'height:100%'};transform: translate(${x}, -50%)`
})
</script>

<template>
  <div class="container">
    <img class="img" :class="[side]" :style="style" :src="toRawFileUrl(img)" @dragstart.prevent.stop />
  </div>
</template>

<style lang="scss" scoped>
.container {
  position: relative;
  user-select: none;
  height: 100%;

  .img {
    position: absolute;
    top: 50%;
  }

  .left {
    transform: translate(50%, -50%);
    right: 0;
  }

  .right {
    transform: translate(-50%, -50%);
    left: 0;
  }
}
</style>