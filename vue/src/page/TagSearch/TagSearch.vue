<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo, type Tag } from '@/api/db'
import { FetchQueue, SearchSelect } from 'vue3-ts-util'
import { CheckOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { uniqueId } from 'lodash-es'

const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const global = useGlobalStore()
const queue = reactive(new FetchQueue())
const info = ref<DataBaseBasicInfo>()
const selectedId = ref(new Set<number>())
const tags = computed(() => info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : [])
const pairid = uniqueId()
onMounted(async () => {
  info.value = await getDbBasicInfo()
})

const onUpdateBtnClick = async () => {
  queue.pushAction(async () => {
    await updateImageData()
    info.value = await getDbBasicInfo()

  })
}

const query = () => {
  global.openTagSearchMatchedImageGridInRight(props.tabIdx, pairid, Array.from(selectedId.value))
}

const toTagDisplayName = (v: Tag) => v.display_name ? `${v.display_name} : ${v.name}` : v.name

</script>
<template>
  <div class="container">
    <ASelect v-if="false" />
    <template v-if="info">
      <div>
        <div>
          <SearchSelect :conv="{ value: v => v.id, text: toTagDisplayName, }" mode="multiple" style="width: 100%;"
            :options="tags" :value="Array.from(selectedId)" placeholder="Select tags to match images"
            @update:value="v => selectedId = new Set(v)" />
        </div>
        <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary" v-if="info.expired || !info.img_count">
          {{
            info.img_count === 0 ? 'Generate index for search image' : 'Update index' }}</AButton>
        <AButton v-else type="primary" @click="query" :loading="!queue.isIdle">Search</AButton>
      </div>
      <ul class="tag-list">
        <li v-for="tag in tags" :key="tag.id" class="tag " :class="{ selected: selectedId.has(tag.id) }"
          @click="selectedId.has(tag.id) ? selectedId.delete(tag.id) : selectedId.add(tag.id)">
          <CheckOutlined v-if="selectedId.has(tag.id)" />
          {{ toTagDisplayName(tag) }}
        </li>
      </ul>
    </template>
  </div>
</template>
<style scoped lang="scss">
.container {
  height: var(--pane-max-height);
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  .tag-list {
    list-style: none;
    padding: 0;
    overflow: scroll;

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