<script setup lang="ts">
import { onMounted, ref, nextTick } from 'vue'
import { getUploadTaskStatus, greeting, upload } from './api'
import { Task } from './util/pollTask'
const msg = ref('')
const msgs = ref([] as string[])
onMounted(async () => {
  msg.value = await greeting()
})
const logListEl = ref<HTMLDivElement>()
const logListScroll2bottom = async () => {
  await nextTick()
  const el = logListEl.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}
const onUploadBtnClick = async () => {
  msgs.value = []
  const { id } = await upload()
  await Task.run({
    action: () => getUploadTaskStatus(id),
    pollInterval: 2000,
    validator (r) {
      msgs.value.push(...r.msgs)
      logListScroll2bottom()
      return !r.running
    }
  }).completedTask
}

</script>

<template>
  <div class="container">

    <div class="action-bar">
      <button class="gr-button gr-button-lg gr-button-secondary" @click="onUploadBtnClick">开始上传</button>
    </div>
    <div class="log-list" ref="logListEl">
      <div v-for="msg, idx in msgs" :key="idx">
        {{ msg }}
      </div>
    </div>
  </div>
</template>
<style scoped>
.action-bar {
  margin: 16px;
}
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.log-list {
  flex: 1;
  overflow: auto;
}
</style>

<style>
#baidu_netdisk_container {
  max-height: 70vh;
}
</style>