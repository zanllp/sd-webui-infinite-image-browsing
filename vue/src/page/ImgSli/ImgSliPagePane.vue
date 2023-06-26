<script setup lang="ts">
import ImgSliComparePane from './ImgSliComparePane.vue';
import { FileNodeInfo } from '@/api/files'
defineProps<{
  paneIdx: number,
  tabIdx: number,
  left: FileNodeInfo,
  right: FileNodeInfo
}>()
</script>
<template>
<ImgSliComparePane :left="left" :right="right">
</ImgSliComparePane>
</template>