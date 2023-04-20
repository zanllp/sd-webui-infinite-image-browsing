<script lang="ts" setup>
import { onMounted } from 'vue'
import {getDbBasicInfo, InitImageData} from '@/api/db'
import { reactive } from 'vue'
import { FetchQueue } from 'vue3-ts-util'

const queue = reactive(new FetchQueue())

onMounted(async () => {
  const info = await getDbBasicInfo()
  console.log(info)
})

const onClick = () => {
  queue.pushAction(InitImageData)
}
</script>
<template>
<div>
<AButton @click="onClick" :loading="!queue.isIdle">安装</AButton>
</div>
</template>
<style scoped lang="scss">
</style>