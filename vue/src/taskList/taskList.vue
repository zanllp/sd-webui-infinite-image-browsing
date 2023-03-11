<script setup lang="ts">
import { key } from '@/util'
import { onMounted, ref } from 'vue'
import { SearchSelect, type WithId, typedID, Task } from 'vue3-ts-util'
import { PlusOutlined } from '@/icon'
import { createBaiduYunTask, getUploadTasks, getUploadTaskTickStatus, type UploadTaskSummary } from '@/api'
import { message } from 'ant-design-vue'

const tasks = ref<WithId<UploadTaskSummary>[]>([])
const ID = typedID<UploadTaskSummary>(true)
onMounted(async () => {
  const resp = await getUploadTasks()
  tasks.value = resp.tasks.map(ID)
  const runningTasks = tasks.value.filter(v => v.running)
  if (runningTasks.length) {
    runningTasks.forEach(v => {

      createPollTask(v.id).completedTask.then(() => message.success('上传完成'))
    })
  } else {
    addEmptyTask()
  }
})

const addEmptyTask = () => {
  tasks.value.unshift(
    ID({
      type: 'upload',
      send_dirs: '',
      recv_dir: '',
      id: '',
      running: false,
      start_time: '',
      n_failed_files: 0,
      n_files: 0,
      n_success_files: 0
    })
  )

}

const createNewTask = async (idx: number) => {
  const task = tasks.value[idx]
  task.running = true
  task.n_files = 100
  const resp = await createBaiduYunTask(task)
  task.id = resp.id
  createPollTask(resp.id).completedTask.then(() => message.success('上传完成'))
}

const createPollTask = (id: string) => {
  return Task.run({
    action: () => getUploadTaskTickStatus(id),
    pollInterval: 500,
    validator (r) {
      const idx = tasks.value.findIndex(v => v.id === id)
      tasks.value[idx] = ID(r.task_summary)
      return !r.task_summary.running
    }
  })
}

const getIntPercent = (task: UploadTaskSummary) => parseInt((((task.n_failed_files + task.n_success_files) / task.n_files) * 100).toString())
</script>

<template>
  <div class="wrapper">
    <a-select style="display: none" />
    <a-button @click="addEmptyTask">
      <template>
        <plus-outlined />
      </template>
      添加一个任务
    </a-button>
    <div v-for="task, idx in tasks" :key="key(task)" class="task-form">
      <a-form :label-col="{ span: 4 }" :wrapper-col="{ span: 24 }">
        <a-form-item label="发送的文件夹">
          <a-textarea auto-size :disabled="task.running" v-model:value="task.send_dirs"
            placeholder="发送文件的文件夹,多个文件夹使用逗号分隔"></a-textarea>
        </a-form-item>
        <a-form-item label="接受的文件夹">
          <a-input v-model:value="task.recv_dir" :disabled="task.running" placeholder="用于接收的文件夹，可以使用占位符进行动态生成"></a-input>
        </a-form-item>
        <a-form-item label="任务类型">
          <search-select v-model:value="task.type" :disabled="task.running" :options="['upload', 'download']"
            :conv="{ value: (v) => v, text: (v) => (v === 'upload' ? '上传' : '下载') }"></search-select>
        </a-form-item>
      </a-form>
      <a-button type="primary" :loading="task.running" :disabled="task.running" @click="createNewTask(idx)">开始</a-button>
      <a-progress v-if="task.running" :stroke-color="{
        from: '#108ee9',
        to: '#87d068'
      }" :percent="getIntPercent(task)" status="active" />
    </div>
  </div>
</template>
<style scoped lang="scss">
.wrapper {
  padding: 8px;

  .task-form {
    border-radius: 8px;
    background: #f8f8f8;
    padding: 8px;
    margin: 9px;
  }
}
</style>
