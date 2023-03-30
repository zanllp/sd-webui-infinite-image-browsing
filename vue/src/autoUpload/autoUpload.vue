<script setup lang="ts">
import { ref } from 'vue'
import { autoUploadOutput } from  '@/api/index'
import { Task }  from 'vue3-ts-util'
const recvDir = ref("")
const task = ref<ReturnType<typeof runPollTask>>()
const runPollTask = () => {
  return Task.run({
    action: () => autoUploadOutput(recvDir.value),
    pollInterval: 30_000
  })
}
const onStart = async () => {
  if (task.value) {
    task.value.clearTask()
    task.value = undefined
  } else {
    task.value = runPollTask()
  }
  
}
</script>
<template><div>
  <AInput v-model:value="recvDir"></AInput>
  <AButton @click="onStart">{{ task ? '暂停' : '开始' }}</AButton>
</div></template>