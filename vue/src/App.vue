<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { FetchQueue } from 'vue3-ts-util'
import { getUserInfo, type UserInfo, logout, loginByBduss } from './api/user'
import { LogoutOutlined, LoginOutlined } from '@/icon'
import { message } from 'ant-design-vue'
import { isAxiosError } from 'axios'
import fileTransfer from './fileTransfer/fileTransfer.vue'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'

const user = ref<UserInfo>()
const bduss = ref('')
const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
const globalStore = useGlobalStore()
onMounted(async () => {
  getGlobalSetting().then((resp) => {
    globalStore.conf = resp
  })
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

    <file-transfer/>
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