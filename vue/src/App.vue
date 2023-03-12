<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { computed } from 'vue'
import { copy2clipboard, SplitView } from 'vue3-ts-util'
import { useTaskListStore } from './store/useTaskListStore'
import LogDetail from './taskList/logDetail.vue'
import TaskList from './taskList/taskList.vue'
const store = useTaskListStore()
const percent = computed(() => !store.splitView.open ? 100 : store.splitView.percent)
const copy = (text: string) => {
  copy2clipboard(text, `复制 "${text}" 成功，粘贴使用"`)
}
</script>

<template>
  <div class="container">
    <div class="global-setting">

      <a-form layout="inline">
        <a-form-item label="轮询间隔">
          <a-input-number v-model:value="store.pollInterval" :min="0.5" :disabled="!store.queue.isIdle" /> (s)
          <sub>越小对网络压力越大</sub>
        </a-form-item>
      </a-form>
      <div class="actions-bar">
        <a-button @click="copy('<#%Y-%m-%d#>')">复制日期占位符</a-button>
        <a-button @click="copy('<#%H-%M-%S#>')">复制时间占位符</a-button>
        <a-button @click="copy('<#%Y-%m-%d %H-%M-%S#>')">复制日期+时间占位符</a-button>
      </div>
    </div>
    <split-view v-model:percent="percent">
      <template #left>
        <task-list>

        </task-list>
      </template>
      <template #right>
        <log-detail />
      </template>
    </split-view>
  </div>
</template>
<style scoped lang="scss">
.global-setting {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;
  .actions-bar > * {
    margin-left: 16px;
  }
}

.container {
  height: 100vh; // todo 暂时这样，这个不重要
  width: 95%;
}
</style>