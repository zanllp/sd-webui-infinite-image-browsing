<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { computed } from 'vue'
import { SplitView } from 'vue3-ts-util'
import { useTaskListStore } from './store/useTaskListStore'
import LogDetail from './taskList/logDetail.vue'
import TaskList from './taskList/taskList.vue'
const store = useTaskListStore()
const percent = computed(() => !store.splitView.open ? 100 : store.splitView.percent)
</script>

<template>
  <div class="container">
    <div class="global-setting">

      <a-form layout="inline">
      <a-form-item label="轮询间隔" >
        <a-input-number v-model:value="store.pollInterval" :min="0.5" :disabled="!store.queue.isIdle"/> (s) <sub>越小对网络压力越大</sub>
      </a-form-item>
    </a-form>
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
}
.container {
  height: 100vh; // todo 暂时这样，这个不重要
  width: 95%;
}
</style>