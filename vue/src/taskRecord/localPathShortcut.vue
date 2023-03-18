<script setup lang="ts">
import type { UploadTaskSummary } from '@/api'
import { useTaskListStore } from '@/store/useTaskListStore'
import { storeToRefs } from 'pinia'
import { deepComputedEffect, type WithId } from 'vue3-ts-util'
const props = defineProps<{ task: WithId<UploadTaskSummary>, idx: number }>()
const emit = defineEmits<{ (t: 'update:task', v: WithId<UploadTaskSummary>): void }>()
const task = deepComputedEffect({ get: () => props.task, set: v => emit('update:task', v) })
const store = useTaskListStore()
const { showDirAutoCompletedIdx, autoCompletedDirList } = storeToRefs(store)

const addDir2task = (dir: string) => {
  if (task.value.type === 'download') {
    task.value.recv_dir = dir
    return
  }
  const spReg = /[,，\n]$/
  if (spReg.test(task.value.send_dirs) || !task.value.send_dirs.trim()) {
    task.value.send_dirs += dir
  } else {
    task.value.send_dirs += ` , ${dir}`
  }
}
const colors = ['#f5222d', '#1890ff', '#ff3125', '#d46b08', '#007bff', '#52c41a', '#13c2c2', '#fa541c', '#eb2f96', '#2f54eb']
</script>
<template>
  <div v-if="showDirAutoCompletedIdx === idx" class="auto-completed-dirs">
    <a-tooltip v-for="item, tagIdx in autoCompletedDirList" :key="item.dir" :title="item.dir + '  点击添加'">
      <a-tag :visible="!task.send_dirs.includes(item.dir)" :color="colors[tagIdx % colors.length]"
        @click="addDir2task(item.dir)">{{ item.zh }}</a-tag>
    </a-tooltip>
  </div>
</template>
<style lang="scss" scoped>
.auto-completed-dirs {
  margin-top: 16px;
}
</style>