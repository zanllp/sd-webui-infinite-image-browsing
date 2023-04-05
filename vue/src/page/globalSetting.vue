<script setup lang="ts">
import { logout } from '@/api/user'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useTaskListStore } from '@/store/useTaskListStore'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { reactive } from 'vue'
import { FetchQueue } from 'vue3-ts-util'

const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
const globalStore = useGlobalStore()

const taskStore = useTaskListStore()
const { user } = storeToRefs(globalStore)
const onLogoutBtnClick = async () => {
  await queue.pushAction(logout).res
  user.value = undefined
  message.info('登出成功')
}

</script>
<template>
  <div class="panel">
    <a-form>
      <a-form-item label="使用缩略图预览">
        <a-switch v-model:checked="globalStore.enableThumbnail" />
      </a-form-item>
      <a-form-item label="轮询间隔">
        <a-input-number v-model:value="taskStore.pollInterval" :min="0.5" :disabled="!taskStore.queue.isIdle" /> (s)
        <sub>越小对网络压力越大</sub>
      </a-form-item>
      <template v-if="user">
        <a-form-item label="百度云已登录用户">
          {{ user.username }}
          <a-button @click="onLogoutBtnClick" :loading="!queue.isIdle">
            <template #icon>
              <logout-outlined />
            </template>
            登出
          </a-button>
        </a-form-item>
      </template>
    </a-form>
  </div>
</template>
<style lang="scss" scoped>
.panel {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: var(--zp-primary-background);

  &> :not(:first-child) {
    margin-left: 16px;
  }
}
</style>