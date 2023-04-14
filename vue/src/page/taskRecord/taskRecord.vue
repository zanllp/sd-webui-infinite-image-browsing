<script setup lang="ts">
import { key, pick } from '@/util'
import { onMounted, ref } from 'vue'
import { typedID, Task, SearchSelect, copy2clipboard } from 'vue3-ts-util'
import { PlusOutlined, SyncOutlined, MinusCircleOutlined } from '@/icon'
import { cancelTask, createBaiduYunTask, getUploadTasks, getUploadTaskTickStatus, removeTask, type UploadTaskSummary } from '@/api'
import { message } from 'ant-design-vue'
import { useTaskListStore } from '@/store/useTaskListStore'
import { storeToRefs } from 'pinia'
import { uniqBy } from 'lodash-es'
import localPathShortcut from './localPathShortcut.vue'
import { useGlobalStore } from '@/store/useGlobalStore'
import { onBeforeUnmount } from 'vue'
import { watch } from 'vue'

const props = defineProps<{ tabIdx: number, paneIdx: number }>()

const ID = typedID<UploadTaskSummary>(true)
const store = useTaskListStore()
const globalStore = useGlobalStore()
const { tasks } = storeToRefs(store)
const { showDirAutoCompletedIdx } = storeToRefs(store)
const pollTaskMap = new Map<string, ReturnType<typeof createPollTask>>()
const loadNum = ref(10)

onMounted(() => globalStore.openBaiduYunIfNotLogged(props.tabIdx, props.paneIdx))

onBeforeUnmount(() => {
  pollTaskMap.forEach(v => v.clearTask())
})
const canProcessQueue = ref(false)
watch([() => store.pendingBaiduyunTaskQueue, canProcessQueue], async ([q, can]) => {
  if (!q.length || !can) {
    return
  }
  console.log('processQueue', q)
  for (const task of q) {
    tasks.value.unshift(ID({ ...getEmptyTask(), ...task }))
    createNewTask(0).then(() => message.success('创建完成，在任务列表查看进度'))
  }
  store.pendingBaiduyunTaskQueue = []
}, { deep: true, immediate: true })

onMounted(async () => {
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
      createPollTask(v.id).completedTask.then(() => message.success(`${v.type === 'download' ? '下载' : '上传'}完成`))
    })
  }
  if (!tasks.value.length) {
    addEmptyTask()
  }
  canProcessQueue.value = true
  console.log('task record load')
})

const getEmptyTask = () => ID({
  type: 'upload',
  send_dirs: [],
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
  task.send_dirs = task.send_dirs.map(v => v.trim()).filter(v => v)
  task.recv_dir = task.recv_dir.trim()
  if (!(task.type === 'upload' ? task.recv_dir.startsWith('/') : task.send_dirs.every(v => v.startsWith('/')))) {
    return message.error('百度云的位置必须以 “/” 开头')
  }
  task.running = true
  task.n_files = 100
  const resp = await createBaiduYunTask(task)
  task.id = resp.id
  createPollTask(resp.id).completedTask.then(() => message.success(task.type === 'upload' ? '上传完成' : '下载完成'))
}

const createPollTask = (id: string) => {
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
const isDone = (task: UploadTaskSummary) => !!task.id && !task.running && !task.canceled
const isDisable = (task: UploadTaskSummary) => task.running || isDone(task)

const copyFrom = (idx: number) => {
  const prevTask = tasks.value[idx]
  tasks.value.unshift({
    ...getEmptyTask(),
    ...pick(prevTask, 'send_dirs', 'type', 'recv_dir')
  })
  message.success('复制完成，已添加到最前端')
}

const openLogDetail = (idx: number) => {
  globalStore.openLogDetailInRight(props.tabIdx, tasks.value[idx].id)
}

const cancel = async (idx: number) => {
  const task = tasks.value[idx]
  const { last_tick } = await cancelTask(task.id)
  store.taskLogMap.get(task.id)!.push(...last_tick.tasks)
  tasks.value[idx] = ID(last_tick.task_summary)
  pollTaskMap.get(task.id)?.clearTask()
}

const remove = async (idx: number) => {
  const task = tasks.value[idx]
  tasks.value.splice(idx, 1)
  task.id && removeTask(task.id)
  message.success('删除完成')
}


const copy = (text: string) => {
  copy2clipboard(text, `复制 "${text}" 成功，粘贴使用"`)
}

</script>

<template>
  <div class="panel">

    <div class="actions-bar">
      <a-button @click="copy('<#%Y-%m-%d#>')">复制日期占位符</a-button>
      <a-button @click="copy('<#%H-%M-%S#>')">复制时间占位符</a-button>
      <a-button @click="copy('<#%Y-%m-%d %H-%M-%S#>')">复制日期+时间占位符</a-button>
    </div>
  </div>
  <div class="wrapper" @click="showDirAutoCompletedIdx = -1">
    <a-select style="display: none" />
    <a-button @click="addEmptyTask" block style="border-radius: 8px;">
      <template #icon>
        <plus-outlined />
      </template>
      添加一个任务
    </a-button>
    <div v-for="task, idx in tasks.slice(0, loadNum)" :key="key(task)" class="task-form">
      <div class="top-bar">

        <a-tag color="success" v-if="isDone(task)">已完成</a-tag>
        <a-tag color="processing" v-if="task.running">{{ task.type === 'download' ? '下载' : '上传' }}中 <template #icon>
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
        <a-form-item label="任务类型">
          <search-select v-model:value="task.type" :disabled="isDisable(task)" :options="['upload', 'download']"
            :conv="{ value: (v) => v, text: (v) => (v === 'upload' ? '上传' : '下载') }"></search-select>
        </a-form-item>
        <a-form-item :label="`发送的文件夹 (${task.type === 'upload' ? '本地' : '百度云'})`"
          @click.stop="task.type === 'upload' && (showDirAutoCompletedIdx = idx)">
          <a-textarea auto-size :disabled="isDisable(task)" :value="task.send_dirs.join()"
            @update:value="v => task.send_dirs = v.split(',')" allow-clear
            placeholder="发送文件的文件夹,多个文件夹使用逗号或者换行分隔。支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"></a-textarea>
          <local-path-shortcut v-if="task.type === 'upload'" :task="task" @update:task="v => tasks[idx] = v" :idx="idx" />

        </a-form-item>
        <a-form-item :label="`接收的文件夹 (${task.type !== 'upload' ? '本地' : '百度云'})`">
          <a-input v-model:value="task.recv_dir" :disabled="isDisable(task)" allow-clear
            @click.stop="task.type === 'download' && (showDirAutoCompletedIdx = idx)"
            placeholder="用于接收的文件夹，支持使用占位符例如stable-diffusion-webui最常用表示日期的<#%Y-%m-%d#>"></a-input>
          <local-path-shortcut v-if="task.type === 'download'" :task="task" @update:task="v => tasks[idx] = v"
            :idx="idx" />
        </a-form-item>
      </a-form>

      <div class="action-bar">
        <a-button @click="openLogDetail(idx)" v-if="store.taskLogMap.get(task.id)">查看详细日志</a-button>
        <a-button @click="copyFrom(idx)">复制该任务</a-button>
        <a-button @click="cancel(idx)" v-if="task.running" danger>取消任务</a-button>
        <a-button @click="remove(idx)" :disabled="task.running" danger>移除</a-button>
        <a-button type="primary" v-if="!isDone(task)" :loading="task.running" :disabled="task.running"
          @click="createNewTask(idx)">开始</a-button>
      </div>
      <a-progress v-if="task.running" :stroke-color="{
        from: '#108ee9',
        to: '#87d068'
      }" :percent="getIntPercent(task)" status="active" />
    </div>
    <a-button @click="loadNum += 5" v-if="loadNum < tasks.length" block style="border-radius: 8px;">
      继续加载
    </a-button>
  </div>
</template>
<style scoped lang="scss">
.panel {
  display: flex;
  padding: 4px;
  justify-content: space-between;

  .actions-bar>* {
    margin-left: 16px;
  }
}

.wrapper {
  height: calc(100vh - 128px);
  overflow: auto;
  padding: 8px;


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
    background: var(--zp-secondary-background);
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
