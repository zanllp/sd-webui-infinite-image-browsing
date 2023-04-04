<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { copy2clipboard, SplitView } from 'vue3-ts-util'
import { useTaskListStore } from '../store/useTaskListStore'
import LogDetail from './logDetail.vue'
import TaskList from './taskRecord.vue'

const store = useTaskListStore()
const percent = computed(() => !store.splitView.open ? 100 : store.splitView.percent)
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
    </div>

  </div>
</template>
<style scoped lang="scss">

.opreation-container {
  display: flex;
  flex-direction: column;

  .split-view {
    height: var(--scroll-container-max-height);
  }
}
</style>