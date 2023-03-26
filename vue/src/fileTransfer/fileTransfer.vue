<script setup lang="ts">
import { SplitView } from 'vue3-ts-util'
import StackView from './stackView.vue'
import { useGlobalStore } from '@/store/useGlobalStore'
const store = useGlobalStore()
</script>
<template>
  <split-view v-model:percent="store.stackViewSplit">
    <template #left>
      <stack-view target="local" />
    </template>
    <template #right>
      <stack-view target="netdisk" />
    </template>
  </split-view>
</template>
<style scoped lang="scss"></style>