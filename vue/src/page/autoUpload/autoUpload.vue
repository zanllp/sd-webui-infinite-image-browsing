<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { autoUploadOutput, type UploadTaskSummary } from '@/api/index'
import { delay, Task } from 'vue3-ts-util'
import { useGlobalStore } from '@/store/useGlobalStore'
import { onBeforeUnmount } from 'vue'
import { Loading3QuartersOutlined } from '@/icon'

const emit = defineEmits<{ (e: 'runningChange', v: boolean): void }>()
const global = useGlobalStore()
const pendingFiles = ref<string[]>([])
const task = ref<ReturnType<typeof runPollTask>>()
const running = computed(() => !!(task.value || pendingFiles.value.length))
watchEffect(() => emit('runningChange', running.value))
const taskLog = reactive(new Map<string, UploadTaskSummary>())
const taskLogList = computed(() => Array.from(taskLog.values()))
const completedFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_success_files, 0))
const failededFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_failed_files, 0))
// const allFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_files, 0) + pendingFiles.value.length)

onBeforeUnmount(() => {
  task.value?.clearTask()
})

const runPollTask = () => {
  return Task.run({
    action: async () => {
      const res = await autoUploadOutput(global.autoUploadRecvDir)
      if (res.tick_info) {
        taskLog.set(res.tick_info.task_summary.id, res.tick_info.task_summary)
      }
      pendingFiles.value = res.pending_files
      await delay(10000 * Math.random())
      return res
    },
    pollInterval: 30_000
  })
}


const onStart = async () => {
  if (task.value) {
    task.value.clearTask()
    task.value = undefined
    pendingFiles.value = []
  } else {
    task.value = runPollTask()
  }
}
</script>
<template>
  <div class="container">
    <AInput v-model:value="global.autoUploadRecvDir"></AInput>
    <AButton @click="onStart">
      <template v-if="task">
        <Loading3QuartersOutlined spin />
      </template>
      {{ task ? '暂停' : '开始' }}
    </AButton>
    <a-row>
      <a-col :span="12">
        <a-statistic title="等待上传数量" :value="pendingFiles.length" style="margin-right: 50px" />
      </a-col>
      <a-col :span="12">
        <a-statistic title="上传失败数量" :value="failededFiles" />
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="12">
        <a-statistic title="已完成数量" :value="completedFiles" style="margin-right: 50px" />
      </a-col>
    </a-row>
  </div>
</template>
<style lang="scss" scoped>
.container {
  margin: 16px;

  &>* {
    margin: 8px;
  }
}
</style>