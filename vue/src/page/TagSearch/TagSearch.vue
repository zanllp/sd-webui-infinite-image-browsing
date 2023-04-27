<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo, type Tag } from '@/api/db'
import { FetchQueue, SearchSelect } from 'vue3-ts-util'
import { CheckOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { groupBy, uniqueId } from 'lodash-es'
import type { Dict } from '@/util'

const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const global = useGlobalStore()
const queue = reactive(new FetchQueue(-1, 0, -1, 'throw'))
const info = ref<DataBaseBasicInfo>()
const selectedId = ref(new Set<number>())
const tags = computed(() => info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : [])
const classSort = (["Model", "Sampler", "lora", "pos", "size"]).reduce((p, c, i) => {
  p[c] = i
  return p
}, {} as Dict<number>)
const classifyTags = computed(() => {
  return Object.entries(groupBy(tags.value, v => v.type)).sort((a, b) => classSort[a[0]] - classSort[b[0]])
})
const pairid = uniqueId()
onMounted(async () => {
  info.value = await getDbBasicInfo()
  if (info.value.img_count && info.value.expired) {
    onUpdateBtnClick()
  }
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

const toTagDisplayName = (v: Tag, withType = false) => (withType ? `[${v.type}] ` : '') + (v.display_name ? `${v.display_name} : ${v.name}` : v.name)

</script>
<template>
  <div class="container">
    <ASelect v-if="false" />
    <template v-if="info">
      <div>
        <div class="search-bar">
          <SearchSelect :conv="{ value: v => v.id, text: toTagDisplayName, optionText: v => toTagDisplayName(v, true) }"
            mode="multiple" style="width: 100%;" :options="tags" :value="Array.from(selectedId)"
            placeholder="Select tags to match images" @update:value="v => selectedId = new Set(v)" />
          <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary"
            v-if="info.expired || !info.img_count">
            {{
              info.img_count === 0 ? 'Generate index for search image' : 'Update index' }}</AButton>
          <AButton v-else type="primary" @click="query" :loading="!queue.isIdle" :disabled="!selectedId.size">Search
          </AButton>
        </div>
      </div>
      <div class="list-container">

        <ul class="tag-list" v-for="([name, list]) in classifyTags" :key="name">
          <h3 class="cat-name">{{ $t(name) }}</h3>
          <li v-for="tag in list" :key="tag.id" class="tag " :class="{ selected: selectedId.has(tag.id) }"
            @click="selectedId.has(tag.id) ? selectedId.delete(tag.id) : selectedId.add(tag.id)">
            <CheckOutlined v-if="selectedId.has(tag.id)" />
            {{ toTagDisplayName(tag) }}
          </li>
        </ul>
      </div>
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


  .select {
    padding: 8px;
  }

  .search-bar {
    padding: 8px;
    display: flex;
  }

  .list-container {
    background-color: var(--zp-secondary-background);
    overflow: scroll;
  }

  .tag-list {
    list-style: none;
    padding: 0;
    margin: 16px;
    border-radius: 16px;
    background: var(--zp-primary-background);
    padding: 8px;

    .cat-name {
      position: sticky;
      top: 0;
      padding: 4px 16px;
      background: var(--zp-primary-background);
      border-left: 4px solid var(--primary-color);
      margin: 4px;
    }

    .tag {
      border: 2px solid var(--zp-secondary);
      color: var(--zp-primary);
      border-radius: 999px;
      padding: 4px 16px;
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
