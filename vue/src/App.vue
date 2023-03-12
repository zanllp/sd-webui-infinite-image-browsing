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
  <div class="split-view-container">

    <split-view :percent="percent">
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
<style scoped>
.split-view-container {
  height: 70vh;
}
</style>