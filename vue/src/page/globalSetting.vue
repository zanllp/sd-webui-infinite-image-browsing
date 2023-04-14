<script setup lang="ts">
import { logout } from '@/api/user'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useTaskListStore } from '@/store/useTaskListStore'
import { message } from 'ant-design-vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { reactive } from 'vue'
import { FetchQueue } from 'vue3-ts-util'

const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
const globalStore = useGlobalStore()

const taskStore = useTaskListStore()
const { user } = storeToRefs(globalStore)
const onLogoutBtnClick = async () => {
  await queue.pushAction(logout).res
  user.value = undefined
  message.info(t('logoutSuccess'))
}
const langChanged = ref(false)
const w = window
</script>
<template>
  <div class="panel">
    <a-form>
      <a-form-item :label="$t('useThumbnailPreview')">
        <a-switch v-model:checked="globalStore.enableThumbnail" />
      </a-form-item>
      <a-form-item :label="$t('pollingInterval')">
        <a-input-number v-model:value="taskStore.pollInterval" :min="0.5" :disabled="!taskStore.queue.isIdle" /> (s)
        <sub>{{ $t('smallerIntervalMeansMoreNetworkTraffic') }}</sub>
      </a-form-item>
      <a-form-item :label="$t('gridThumbnailWidth')">
        <a-input-number v-model:value="globalStore.gridThumbnailSize" :min="256" :max="1024" /> (px)
      </a-form-item>
      <a-form-item :label="$t('largeGridThumbnailWidth')">
        <a-input-number v-model:value="globalStore.largeGridThumbnailSize" :min="256" :max="1024" /> (px)
      </a-form-item>
      <a-form-item :label="$t('lang')">
        <div class="lang-select-wrap">
          <a-select v-model:value="globalStore.lang" @change="langChanged = true" >
            <a-select-option value="zh">
              中文
            </a-select-option>
            <a-select-option lang="en">
              English
            </a-select-option>
          </a-select>
        </div>
        <a-button type="primary" @click="w.location.reload()" v-if="langChanged" ghost>{{ t('langChangeReload') }}</a-button>
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

.lang-select-wrap {
  width: 128px;
  display: inline-block;
  padding-right: 16px;
}
</style>