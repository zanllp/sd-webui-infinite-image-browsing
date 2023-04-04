<script lang="ts" setup>
import { useTaskListStore } from '@/store/useTaskListStore'
import { computed, watch, nextTick, ref } from 'vue'
const props = defineProps<{
  logDetailId: string
}>()
const store = useTaskListStore()
const logListEl = ref<HTMLDivElement>()
const currList = computed(() => store.taskLogMap.get(props.logDetailId))
watch(currList, async () => {
  await nextTick()
  const el = logListEl.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}, { deep: true })

</script>
<template>
  <div class="container" >
    <ul class="list" ref="logListEl" >
      <li v-for="log, idx  in currList" :key="idx" >
        <pre>{{ log.log }}</pre>
      </li>
    </ul>
  </div>
</template>
<style lang="scss" scoped>
.container {
  height: 100%;
  position: relative;
  .close-btn {
    position: absolute;
    right: 20px;
    top: 20px;
  }
}

.list {
  font-family: Consolas, Menlo, monospace;
  height: 90vh;
  overflow: auto;
  padding: 16px;
  margin: 16px;
  border-radius: 16px;
  background-color: var(--zp-secondary-background);

  color: var(--zp-primary);
  margin-left: 16px;
  list-style: none;
  font-size: 12px;

  pre {
    margin: 2px;
    white-space: normal;
  }

  &::-webkit-scrollbar {
    display: none;
  }


}
</style>