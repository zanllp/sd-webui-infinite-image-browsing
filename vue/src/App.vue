<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { copy2clipboard, FetchQueue, SplitView } from 'vue3-ts-util'
import { getUserInfo, type UserInfo, logout, loginByBduss } from './api/user'
import { useTaskListStore } from './store/useTaskListStore'
import LogDetail from './taskList/logDetail.vue'
import TaskList from './taskList/taskList.vue'
import { LogoutOutlined, LoginOutlined } from '@/icon'
import { message } from 'ant-design-vue'
import { isAxiosError } from 'axios'
const store = useTaskListStore()
const user = ref<UserInfo>()
const bduss = ref('')
const percent = computed(() => !store.splitView.open ? 100 : store.splitView.percent)
const copy = (text: string) => {
  copy2clipboard(text, `复制 "${text}" 成功，粘贴使用"`)
}
const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
onMounted(async () => {
  user.value = await queue.pushAction(getUserInfo).res
})

const onLogoutBtnClick = async () => {
  await queue.pushAction(logout).res
  user.value = undefined
}

const onLoginBtnClick = async () => {
  try {
    user.value = await queue.pushAction(() => loginByBduss(bduss.value)).res
  } catch (error) {
    console.error(error)
    message.error(isAxiosError(error) ? error.response?.data?.detail ?? '未知错误' : '未知错误')
  }
}
</script>

<template>
  <a-skeleton :loading="!queue.isIdle">

    <div class="panel">
      <template v-if="user">
        <div>
          已登录用户：{{ user.username }}
        </div>
        <a-button @click="onLogoutBtnClick">
          <template #icon>
            <logout-outlined />
          </template>
          登出
        </a-button>
      </template>

      <a-form layout="inline" v-else>
        <a-form-item label="bduss">
          <a-input v-model:value="bduss" style="width:300px"></a-input>
        </a-form-item>
        <a-form-item>
          <a-button @click="onLoginBtnClick" type="primary">
            <template #icon>
              <login-outlined />
            </template>
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
    <div class="opreation-container" v-if="user">
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
  </a-skeleton>
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