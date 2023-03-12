<script setup lang="ts">
import { key } from '@/util'
import { onMounted, ref } from 'vue'
import { SearchSelect, type WithId, typedID, Task } from 'vue3-ts-util'
import { PlusOutlined, SyncOutlined } from '@/icon'
import { createBaiduYunTask, getUploadTasks, getUploadTaskTickStatus, type UploadTaskSummary } from '@/api'
import { message } from 'ant-design-vue'
import { pick } from 'lodash-es'
import { useTaskListStore } from '@/store/useTaskListStore'
const tasks = ref<WithId<UploadTaskSummary>[]>([])
const ID = typedID<UploadTaskSummary>(true)
const store = useTaskListStore()

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

const getEmptyTask = () => ID({
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

const addEmptyTask = () => {
  tasks.value.unshift(getEmptyTask())

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
  store.taskLogMap.delete(id)
  store.taskLogMap.set(id, [])
  return Task.run({
    action: () => getUploadTaskTickStatus(id),
    pollInterval: 500,
    validator (r) {
      store.taskLogMap.get(id)!.push(...r.tasks)
      const idx = tasks.value.findIndex(v => v.id === id)
      tasks.value[idx] = ID(r.task_summary)
      return !r.task_summary.running
    }
  })
}

const getIntPercent = (task: UploadTaskSummary) => parseInt((((task.n_failed_files + task.n_success_files) / task.n_files) * 100).toString())
const isDone = (task: UploadTaskSummary) => task.id && !task.running

const copyFrom = (idx: number) => {
  const prevTask = tasks.value[idx]
  tasks.value.unshift({
    ...getEmptyTask(),
    ...pick(prevTask, ['send_dirs', 'type', 'recv_dir'])
  })
  message.success('复制完成，已添加到最前端')
}

const openLogDetail = (idx: number) => {
  store.currLogDetailId = tasks.value[idx].id
  store.splitView.open = true
}
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
      <div class="top-bar">

        <a-tag color="success" v-if="isDone(task)">已完成</a-tag>
        <a-tag color="processing" v-if="task.running">上传中 <template #icon>
            <sync-outlined :spin="true" />
          </template></a-tag>
        <div class="flex-placeholder"></div>
        <div v-if="task.start_time">
          开始时间： {{ task.start_time }}
        </div>
      </div>
      <a-form layout="vertical" label-align="left">
        <a-form-item label="发送的文件夹">
          <a-textarea auto-size :disabled="task.running" v-model:value="task.send_dirs"
            placeholder="发送文件的文件夹,多个文件夹使用逗号分隔"></a-textarea>
        </a-form-item>
        <a-form-item label="百度云文件夹">
          <a-input v-model:value="task.recv_dir" :disabled="task.running" placeholder="用于接收的文件夹，可以使用占位符进行动态生成"></a-input>
        </a-form-item>
        <!--a-form-item label="任务类型">
                <search-select v-model:value="task.type" :disabled="task.running" :options="['upload', 'download']"
                  :conv="{ value: (v) => v, text: (v) => (v === 'upload' ? '上传' : '下载') }"></search-select>
              </a-form-item-->
      </a-form>
      <div class="action-bar">
        <a-button @click="openLogDetail(idx)" v-if="store.taskLogMap.get(task.id)">查看详细日志</a-button>
        <a-button @click="copyFrom(idx)">复制该任务</a-button>
        <a-button @click="tasks.splice(idx, 1)" :disabled="task.running" danger>移除</a-button>
        <a-button type="primary" v-if="!isDone(task)" :loading="task.running" :disabled="task.running"
          @click="createNewTask(idx)">开始</a-button>
      </div>
      <a-progress v-if="task.running" :stroke-color="{
        from: '#108ee9',
        to: '#87d068'
      }" :percent="getIntPercent(task)" status="active" />
    </div>
  </div>
</template>
<style scoped lang="scss">
.flex-placeholder {
  flex: 1;
}

.wrapper {
  height: 100%;
  overflow: auto;
  padding: 8px;
  &::-webkit-scrollbar {
    display: none;
  }

  .action-bar {
    display: flex;
    justify-content: end;
    align-items: center;

    &>* {
      margin-left: 8px;
    }
  }

  .task-form {
    border-radius: 16px;
    background: #f8f8f8;
    padding: 16px;
    margin: 16px 8px;

    .top-bar {
      display: flex;
      flex-direction: row;
      margin-bottom: 16px;

    }
  }
}
</style>
