<script setup lang="ts">
import { key, pick } from '@/util'
import { onMounted, ref } from 'vue'
import { typedID, Task } from 'vue3-ts-util'
import { PlusOutlined, SyncOutlined, MinusCircleOutlined } from '@/icon'
import { cancelTask, createBaiduYunTask, getGlobalSetting, getUploadTasks, getUploadTaskTickStatus, type UploadTaskSummary } from '@/api'
import { message } from 'ant-design-vue'
import { useTaskListStore } from '@/store/useTaskListStore'
import { getAutoCompletedTagList } from './autoComplete'
import { storeToRefs } from 'pinia'
import { uniqBy } from 'lodash-es'

const ID = typedID<UploadTaskSummary>(true)
const store = useTaskListStore()
const { tasks } = storeToRefs(store)
const autoCompletedDirList = ref([] as ReturnType<typeof getAutoCompletedTagList>)
const showDirAutoCompletedIdx = ref(-1)
const pollTaskMap = new Map<string, ReturnType<typeof createPollTask>>()

onMounted(async () => {
  getGlobalSetting().then((resp) => {
    autoCompletedDirList.value = getAutoCompletedTagList(resp).filter(v => v.dir.trim())
  })
  const resp = await getUploadTasks()
  tasks.value = uniqBy([...resp.tasks, ...tasks.value].map(ID), v => v.id) // 前后端合并
    .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time))
    .slice(0, 100)
  let runningTasks = tasks.value.filter(v => v.running)
  runningTasks.filter(task => !resp.tasks.find(beTask => beTask.id === task.id)).forEach(task => { // 在后端中没找到直接标记已完成，防止继续请求
    task.running = false
  })
  runningTasks = tasks.value.filter(v => v.running)
  if (runningTasks.length) {
    runningTasks.forEach(v => {
      createPollTask(v.id).completedTask.then(() => message.success('上传完成'))
    })
  }
  if (!tasks.value.length) {
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
  n_success_files: 0,
  canceled: false
})

const addEmptyTask = () => {
  tasks.value.unshift(getEmptyTask())

}

const createNewTask = async (idx: number) => {
  const task = tasks.value[idx]
  task.send_dirs = task.send_dirs.split(/,，\n/).map(v => v.trim()).filter(v => v).join()
  task.recv_dir = task.recv_dir.trim()
  if (!task.recv_dir.startsWith('/')) {
    return message.error('百度云接收位置必须以 “/” 开头')
  }
  task.running = true
  task.n_files = 100
  const resp = await createBaiduYunTask(task)
  task.id = resp.id
  createPollTask(resp.id).completedTask.then(() => message.success('上传完成'))
}

const createPollTask = (id: string) => {
  store.taskLogMap.delete(id)
  store.taskLogMap.set(id, [])
  const task = Task.run({
    action: () => getUploadTaskTickStatus(id),
    pollInterval: store.pollInterval * 1000,
    validator (r) {
      store.taskLogMap.get(id)!.push(...r.tasks)
      const idx = tasks.value.findIndex(v => v.id === id)
      tasks.value[idx] = ID(r.task_summary)
      return !r.task_summary.running
    }
  })
  pollTaskMap.set(id, task)
  store.queue.pushAction(() => task.completedTask) // 使用queue来判断是否所有任务都已经完成
  return task
}

const getIntPercent = (task: UploadTaskSummary) => parseInt((((task.n_failed_files + task.n_success_files) / task.n_files) * 100).toString())
const isDone = (task: UploadTaskSummary) => task.id && !task.running && !task.canceled

const copyFrom = (idx: number) => {
  const prevTask = tasks.value[idx]
  tasks.value.unshift({
    ...getEmptyTask(),
    ...pick(prevTask, 'send_dirs', 'type', 'recv_dir')
  })
  message.success('复制完成，已添加到最前端')
}

const openLogDetail = (idx: number) => {
  store.currLogDetailId = tasks.value[idx].id
  store.splitView.open = true
}
const colors = ['#f5222d', '#1890ff', '#ff3125', '#d46b08', '#007bff', '#52c41a', '#13c2c2', '#fa541c', '#eb2f96', '#2f54eb']
const addDir2task = (idx: number, dir: string) => {
  const task = tasks.value[idx]
  if (/[,，\n]$/.test(task.send_dirs) || !task.send_dirs.trim()) {
    task.send_dirs += dir
  } else {
    task.send_dirs += ` , ${dir}`
  }
}

const cancel = async (idx: number) => {
  const task = tasks.value[idx]
  const { last_tick } = await cancelTask(task.id)
  store.taskLogMap.get(task.id)!.push(...last_tick.tasks)
  tasks.value[idx] = ID(last_tick.task_summary)
  pollTaskMap.get(task.id)?.clearTask()
}

</script>

<template>
  <div class="wrapper" @click="showDirAutoCompletedIdx = -1">
    <a-select style="display: none" />
    <a-button @click="addEmptyTask" block style="border-radius: 8px;">
      <template #icon>
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
        <a-tag color="default" v-if="task.canceled">
          <template #icon>
            <minus-circle-outlined />
          </template>
          已取消
        </a-tag>
        <div class="flex-placeholder"></div>
        <div v-if="task.start_time">
          开始时间： {{ task.start_time }}
        </div>
      </div>
      <a-form layout="vertical" label-align="left">
        <a-form-item label="发送的文件夹" @click.stop="showDirAutoCompletedIdx = idx">
          <a-textarea auto-size :disabled="task.running" v-model:value="task.send_dirs"
            placeholder="发送文件的文件夹,多个文件夹使用逗号或者换行分隔。支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"></a-textarea>
          <div v-if="idx === showDirAutoCompletedIdx" class="auto-completed-dirs">
            <a-tooltip v-for="item, tagIdx in autoCompletedDirList" :key="item.dir" :title="item.dir + '  点击添加'">
              <a-tag :visible="!task.send_dirs.includes(item.dir)" :color="colors[tagIdx % colors.length]"
                @click="addDir2task(idx, item.dir)">{{ item.zh }}</a-tag>
            </a-tooltip>
          </div>
        </a-form-item>
        <a-form-item label="百度云文件夹">
          <a-input v-model:value="task.recv_dir" :disabled="task.running"
            placeholder="用于接收的文件夹，支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"></a-input>
        </a-form-item>
        <!--a-form-item label="任务类型">
                                      <search-select v-model:value="task.type" :disabled="task.running" :options="['upload', 'download']"
                                        :conv="{ value: (v) => v, text: (v) => (v === 'upload' ? '上传' : '下载') }"></search-select>
                                    </a-form-item-->
      </a-form>
      <div class="action-bar">
        <a-button @click="openLogDetail(idx)" v-if="store.taskLogMap.get(task.id)">查看详细日志</a-button>
        <a-button @click="copyFrom(idx)">复制该任务</a-button>
        <a-button @click="cancel(idx)" v-if="task.running" danger>取消任务</a-button>
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

    .auto-completed-dirs {
      margin-top: 16px;
    }
  }
}
</style>
