<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { copy2clipboard, SplitView } from 'vue3-ts-util'
import { useTaskListStore } from '../store/useTaskListStore'
import LogDetail from './logDetail.vue'
import TaskList from './taskRecord.vue'

const store = useTaskListStore()
const percent = computed(() => !store.splitView.open ? 100 : store.splitView.percent)
const copy = (text: string) => {
  copy2clipboard(text, `复制 "${text}" 成功，粘贴使用"`)
}
onMounted(async () => {
  store.splitView.open = false
})

</script>

<template>
  <div class="opreation-container">
    <div class="panel">
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

    <split-view v-model:percent="percent" class="split-view">
      <template #left>
        <task-list />
      </template>
      <template #right>
        <log-detail />
      </template>
    </split-view>
  </div>
</template>
<style scoped lang="scss">
.panel {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  justify-content: space-between;

  .actions-bar>* {
    margin-left: 16px;
  }
}


.opreation-container {
  display: flex;
  flex-direction: column;

  .split-view {
    height: 900px;
  }
}
</style>