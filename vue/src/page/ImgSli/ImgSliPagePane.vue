<script setup lang="ts">
import ImgSliComparePane from './ImgSliComparePane.vue'
import { FileNodeInfo } from '@/api/files'
defineProps<{
  paneIdx: number,
  tabIdx: number,
  left: FileNodeInfo,
  right: FileNodeInfo
}>()
</script>
<template>
  <div class="img-sli-container">
    <ImgSliComparePane :left="left" :right="right">
    </ImgSliComparePane>
  </div>
</template>

<style lang="scss" scoped>
.img-sli-container {
  position: relative;
  overflow-y: auto;
  height: calc(100vh - 40px);
}
</style>