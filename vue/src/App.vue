<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted, ref, nextTick, reactive, computed } from 'vue'
import { getUploadTaskStatus, greeting, upload, type UploadTaskStatus } from './api'
import { Task } from './util/pollTask'
const pollTask = ref<ReturnType<typeof createUploadPollTask>>()
const allTaskRecord = ref([] as UploadTaskStatus[])
onMounted(async () => {
  await greeting()
})
const taskLatestInfo = reactive(new Map<string, UploadTaskStatus['info']>())
const logListEl = ref<HTMLDivElement>()
const logListScroll2bottom = async () => {
  await nextTick()
  const el = logListEl.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

const createUploadPollTask = (id: string) => {
  const task = Task.run({
    action: () => getUploadTaskStatus(id),
    pollInterval: 500,
    validator (r) {
      r.tasks.forEach(({ info }) => {
        if (info.status === 'start') {
        } else if (info.status == 'done') {
        } else {
          taskLatestInfo.set(info.id, info)
        }
      })
      allTaskRecord.value.push(...r.tasks)
      logListScroll2bottom()
      return !r.running
    }
  })
  return task
}
const onUploadBtnClick = async () => {
  allTaskRecord.value = []
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
      <button @click="onUploadBtnClick" :disabled="uploading">开始上传</button>
    </div>
    <div class="log-list" ref="logListEl" v-if="allTaskRecord.length">
      <div v-for="msg, idx in allTaskRecord" :key="idx">
        {{ msg.log }}
      </div>
    </div>
  </div>
</template>
<style scoped>
* {
  all: revert;
}

button {

  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid grey;
}

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