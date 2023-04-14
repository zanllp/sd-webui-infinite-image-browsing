<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { autoUploadOutput, type UploadTaskSummary } from '@/api/index'
import { delay, Task } from 'vue3-ts-util'
import { useGlobalStore } from '@/store/useGlobalStore'
import { onBeforeUnmount } from 'vue'
import { Loading3QuartersOutlined, CloseCircleOutlined } from '@/icon'
import { useTaskListStore } from '@/store/useTaskListStore'
import { onMounted } from 'vue'

const props = defineProps<{ tabIdx: number, paneIdx: number }>()



const emit = defineEmits<{ (e: 'runningChange', v: boolean): void }>()
const global = useGlobalStore()
const taskStore = useTaskListStore()
const pendingFiles = ref<string[]>([])
const task = ref<ReturnType<typeof runPollTask>>()
const running = computed(() => !!(task.value || pendingFiles.value.length))
watchEffect(() => emit('runningChange', running.value))
const taskLog = reactive(new Map<string, UploadTaskSummary>())
const taskLogList = computed(() => Array.from(taskLog.values()))
const completedFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_success_files, 0))
const failededFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_failed_files, 0))
// const allFiles = computed(() => taskLogList.value.reduce((p, c) => p + c.n_files, 0) + pendingFiles.value.length)

onMounted(() => global.openBaiduYunIfNotLogged(props.tabIdx, props.paneIdx))

onBeforeUnmount(() => {
  task.value?.clearTask()
})

const runPollTask = () => {
  return Task.run({
    action: async () => {
      const res = await autoUploadOutput(global.autoUploadRecvDir)
      if (res.tick_info) {
        const info = res.tick_info!
        taskLog.set(info.task_summary.id, info.task_summary)
        taskStore.taskLogMap.set(info.task_summary.id, info.tasks)
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

const openLogDetail = (id: string) => {
  global.openLogDetailInRight(props.tabIdx, id)
}
</script>
<template>
  <div class="container">
    <AInput v-model:value="global.autoUploadRecvDir"></AInput>
    <AButton @click="onStart">
      <template v-if="task">
        <Loading3QuartersOutlined spin />
      </template>
      {{ task ? $t('start') : $t('pause') }}
    </AButton>
    <a-row>
      <a-col :span="12">
        <a-statistic :title="$t('waitingUploadCount')" :value="pendingFiles.length" style="margin-right: 50px" />
      </a-col>
      <a-col :span="12">
        <a-statistic :title="$t('uploadFailureCount')" :value="failededFiles" />
      </a-col>
    </a-row>
    <a-row>
      <a-col :span="12">
        <a-statistic :title="$t('completedCount')" :value="completedFiles" style="margin-right: 50px" />
      </a-col>
    </a-row>
    <div class="log-container">
      <h2>
        {{ $t('realTimeLog') }}
      </h2> <a-alert :message="$t('tip')" :description="$t('clickToViewLogs')" type="info" show-icon />
      <ul class="scroll-container">
        <li v-for="item in taskLog.values()" :key="item.id" :class="{ err: item.n_failed_files }"
          @click="openLogDetail(item.id)">
          <CloseCircleOutlined v-if="item.n_failed_files" /> {{ $t('startedAt') + item.start_time }}
        </li>
      </ul>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.container {
  margin: 16px;

  &>* {
    margin: 8px;
  }
}

.log-container {
  margin-top: 24px;

  .scroll-container {

    max-height: 512px;
    overflow: auto;
  }

  ul {
    list-style: none;
    padding: 0px;

    li {
      display: inline-block;
      padding: 8px;
      margin: 8px;
      background: var(--zp-secondary-background);
      border-radius: 4px;

      &.err {
        color: red;
      }
    }
  }
}
</style>