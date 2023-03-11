<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted, ref, nextTick, reactive, computed } from 'vue'
import { getUploadTaskFilesState, getUploadTasks, getUploadTaskTickStatus, greeting, upload, type UploadTaskFileStatus, type UploadTaskSummary, type UploadTaskTickStatus } from './api'
import { Task } from 'vue3-ts-util'
import { message } from 'ant-design-vue'

const pollTask = ref<ReturnType<typeof createUploadPollTask>>()
const currUploadTaskTickStatusRecord = ref([] as UploadTaskTickStatus[])
const taskLatestInfo = reactive(new Map<string, UploadTaskFileStatus>())
const logListEl = ref<HTMLDivElement>()
const taskSummaryList = ref([] as UploadTaskSummary[])

onMounted(async () => {
  await greeting()
  const { tasks } = await getUploadTasks()
  taskSummaryList.value = tasks
  const [runningTask] = tasks.filter(v => v.running)
  if (runningTask) {
    message.info(`检测到一个运行中的任务，开始还原`)
    const { files_state } = await getUploadTaskFilesState(runningTask.id)
    Object.entries(files_state).forEach(([k,v]) => taskLatestInfo.set(k,v))
    pollTask.value = createUploadPollTask(runningTask.id)
    pollTask.value.completedTask.then(() => {
      pollTask.value = undefined
    })
  }
})

const logListScroll2bottom = async () => {
  await nextTick()
  const el = logListEl.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

const createUploadPollTask = (id: string) => {
  const task = Task.run({
    action: () => getUploadTaskTickStatus(id),
    pollInterval: 500,
    validator (r) {
      r.tasks.forEach(({ info }) => {
        if (info.status === 'start') {
        } else if (info.status == 'done') {
        } else {
          taskLatestInfo.set(info.id, info)
        }
      })
      currUploadTaskTickStatusRecord.value.push(...r.tasks)
      logListScroll2bottom()
      return !r.running
    }
  })
  return task
}
const onUploadBtnClick = async () => {
  currUploadTaskTickStatusRecord.value = []
  const { id } = await upload()
  pollTask.value = createUploadPollTask(id)
  pollTask.value.completedTask.then(() => {
    pollTask.value = undefined
  })
}

const max = computed(() => taskLatestInfo.size || 100)
const taskLatestInfoArr = computed(() => Array.from(taskLatestInfo))
const done = computed(() => pollTask.value?.task.isFinished)
const uploading = computed(() => pollTask.value?.task.isFinished === false)
const progress = computed(() => {
  if (done.value) {
    return max.value
  }
  return taskLatestInfoArr.value.filter(v => v[1].status === 'upload-success' || v[1].status === 'file-skipped' || v[1].status === 'upload-failed').length
})
const progressPercent = computed(() => progress.value * 100 / max.value)
</script>

<template>
  <div class="container">
    <div class="upload-progress-info" v-if="pollTask">
      <progress :max="max" :value="progress" />
      <div>
        {{ progressPercent.toFixed(2) }} %
      </div>
    </div>
    <div class="action-bar">
      <a-button @click="onUploadBtnClick" :disabled="uploading">开始上传</a-button>
    </div>
    <div>
      <div v-for="task in taskSummaryList" :key="task.id">
        在 {{ task.start_time }} 启动的上传任务: {{ task.running ? '进行中' : '已完成' }}
      </div>
    </div>
    <div class="log-list" ref="logListEl" v-if="currUploadTaskTickStatusRecord.length">
      <div v-for="msg, idx in currUploadTaskTickStatusRecord" :key="idx">
        {{ msg.log }}
      </div>
    </div>
  </div>
</template>
<style scoped>
.action-bar {
  margin: 16px 0;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-progress-info {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.upload-progress-info>* {
  margin-right: 8px;
}

.log-list {
  max-height: 70vh;
  flex: 1;
  overflow: auto;
  background-color: #f5f5f5;
  /* 背景色 */
  border: 1px solid #ccc;
  /* 边框 */
  padding: 10px;
  /* 内边距 */
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.3);
  /* 阴影 */
  border-radius: 5px;
  /* 圆角 */
  font-size: 14px;
  /* 字体大小 */
  line-height: 1.5;
  /* 行高 */
  font-family: Arial, sans-serif;
  /* 字体样式 */
  color: #333;
  /* 字体颜色 */
}
</style>

<style>
#baidu_netdisk_container {
  max-height: 70vh;
}
</style>