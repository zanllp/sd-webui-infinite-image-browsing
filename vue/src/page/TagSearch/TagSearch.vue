<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo, getImagesByTags } from '@/api/db'
import { FetchQueue } from 'vue3-ts-util'
import { CheckOutlined } from '@/icon'

const queue = reactive(new FetchQueue())
const info = ref<DataBaseBasicInfo>()
const selectedId = ref(new Set<number>())
const tags = computed(() => info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : [])

onMounted(async () => {
  info.value = await getDbBasicInfo()
  console.log(info, tags)
})

const onUpdateBtnClick = async () => {
  queue.pushAction(async () => {
    await updateImageData()
    info.value = await getDbBasicInfo()

  })
}

const query = () => {
  console.log(selectedId.value)
  queue.pushAction(() => getImagesByTags(Array.from(selectedId.value)))
}
</script>
<template>
  <div v-if="info" class="container">
    <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary" v-if="info.expired || !info.img_count">{{
      info.img_count === 0 ? 'gen idx' : 'updat index' }}</AButton><AButton v-else type="primary" @click="query" :loading="!queue.isIdle">search</AButton>
    <ul class="tag-list">

      <li v-for="tag in tags" :key="tag.id" class="tag " :class="{ selected: selectedId.has(tag.id) }"
        @click="selectedId.has(tag.id) ? selectedId.delete(tag.id) : selectedId.add(tag.id)">
        <CheckOutlined v-if="selectedId.has(tag.id)" />
        {{ tag.name }}
      </li>
    </ul>
  </div>
</template>
<style scoped lang="scss">
.container {
  height: 100%;
  overflow: auto;

  .tag-list {
    list-style: none;
    padding: 0;
    max-height: 50vh;
    overflow: auto;

    .tag {
      border: 2px solid var(--zp-secondary);
      color: var(--zp-secondary);
      border-radius: 999px;
      padding: 2px 8px;
      margin: 4px;
      display: inline-block;
      cursor: pointer;

      &.selected {
        color: var(--primary-color);
        border: 2px solid var(--primary-color);
      }
    }
  }

}
</style>