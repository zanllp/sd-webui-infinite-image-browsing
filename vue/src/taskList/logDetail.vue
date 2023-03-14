<script lang="ts" setup>
import { useTaskListStore } from '@/store/useTaskListStore'
import { computed, watch, nextTick, ref } from 'vue'

const store = useTaskListStore()
const logListEl = ref<HTMLDivElement>()
const currList = computed(() => store.taskLogMap.get(store.currLogDetailId))
watch(currList, async () => {
  await nextTick()
  const el = logListEl.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}, { deep: true })

</script>
<template>
  <div class="container" v-if="store.splitView.open">
    <a-button @click="store.splitView.open = false" class="close-btn">关闭</a-button>
    <ul class="list" ref="logListEl" >
      <li v-for="log, idx  in currList" :key="idx">
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
  height: calc(100% - 32px);
  overflow: auto;
  padding: 16px;
  margin: 16px;
  border-radius: 16px;
  background-color: #fafafa;

  color: rgb(99, 102, 104);
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

  .title {
    color: rgb(206, 17, 38);
    font-family: sans-serif;
  }

  .src-val {
    font-size: 12px;
    margin-top: 16px;
    background-color: rgba(206, 17, 38, 0.05);
    padding: 8px;
    border-radius: 4px;
    color: black;
  }

}
</style>