<script lang="ts" setup>
import { onMounted, reactive, ref, computed } from 'vue'
import { getDbBasicInfo, updateImageData, type DataBaseBasicInfo, type Tag, addCustomTag, removeCustomTag } from '@/api/db'
import { FetchQueue, SearchSelect } from 'vue3-ts-util'
import { CheckOutlined, PlusOutlined, CloseOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { groupBy, uniqueId } from 'lodash-es'
import type { Dict } from '@/util'
import { Modal, message } from 'ant-design-vue'
import { t } from '@/i18n'

const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const global = useGlobalStore()
const queue = reactive(new FetchQueue(-1, 0, -1, 'throw'))
const loading = computed(() => !queue.isIdle)
const info = ref<DataBaseBasicInfo>()
const selectedId = ref(new Set<number>())
const tags = computed(() => info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : [])
const classSort = (["custom", "Model", "lora", "pos", "size", "Sampler"]).reduce((p, c, i) => {
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
const addInputing = ref(false)
const addTagName = ref('')
const onAddTagBtnSubmit = async () => {
  if (!addTagName.value) {
    addInputing.value = false
    return
  }
  const tag = await queue.pushAction(() => addCustomTag({ tag_name: addTagName.value })).res
  if (tag.type !== 'custom') {
    message.error(t('existInOtherType'))
  }
  if (info.value?.tags.find(v => v.id === tag.id)) {
    message.error(t('alreadyExists'))
  } else {
    info.value?.tags.push(tag)
  }
  addTagName.value = ''
  addInputing.value = false
}
const onTagRemoveClick = (tagId: number) => {
  Modal.confirm({
    title: t('confirmDelete'),
    async onOk() {
      await removeCustomTag({ tag_id: tagId })
      const idx = info.value?.tags.findIndex(v => v.id === tagId) ?? -1
      info.value?.tags.splice(idx, 1)
    }
  })
}
</script>
<template>
  <div class="container">
    <ASelect v-if="false" />
    <template v-if="info">
      <div>
        <div class="search-bar">
          <SearchSelect :conv="{ value: v => v.id, text: toTagDisplayName, optionText: v => toTagDisplayName(v, true) }"
            mode="multiple" style="width: 100%;" :options="tags" :value="Array.from(selectedId)" :disabled="!tags.length"
            placeholder="Select tags to match images" @update:value="v => selectedId = new Set(v)" />
          <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary"
            v-if="info.expired || !info.img_count">
            {{
              info.img_count === 0 ? $t('generateIndexHint') : $t('UpdateIndex') }}</AButton>
          <AButton v-else type="primary" @click="query" :loading="!queue.isIdle" :disabled="!selectedId.size">{{
            $t('search') }}
          </AButton>
        </div>
      </div>

      <p class="generate-idx-hint" v-if="!tags.length">{{ $t('needGenerateIdx') }}</p>
      <div class="list-container">

        <ul class="tag-list" v-for="[name, list] in classifyTags" :key="name">
          <h3 class="cat-name">{{ $t(name) }}</h3>
          <li v-for="tag,idx in list" :key="tag.id" class="tag " :class="{ selected: selectedId.has(tag.id) }"
            @click="selectedId.has(tag.id) ? selectedId.delete(tag.id) : selectedId.add(tag.id)">
            <CheckOutlined v-if="selectedId.has(tag.id)" />
            {{ toTagDisplayName(tag) }}
            <span v-if="(name === 'custom') && (idx !== 0)" class="remove" @click.capture.stop="onTagRemoveClick(tag.id)"> 
              <CloseOutlined/>
            </span>
          </li>
          <li v-if="name === 'custom'" class="tag " @click="addInputing = true">
            <template v-if="addInputing">
              <a-input-group compact>
                <a-input v-model:value="addTagName" style="width: 128px" :loading="loading" allow-clear size="small" />
                <a-button size="small" type="primary" @click.capture.stop="onAddTagBtnSubmit" :loading="loading">{{ addTagName ?
                  $t('submit') :
                  $t('cancel') }}</a-button>
              </a-input-group>
            </template>
            <template v-else>
              <PlusOutlined /> {{ $t('add') }}
            </template>
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


  .generate-idx-hint {
    margin: 64px;
    padding: 64px;
    font-size: 2em;
    text-align: center;
    background-color: var(--zp-secondary-background);
    white-space: pre-line;
    line-height: 2.5em;
    border-radius: 16px;
  }

  .remove {
    padding: 4px;
    position: cursor;
    border-radius: 2px;
    &:hover {
      background-color:var(--zp-secondary-background);
    }
  }

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
      max-width: 256px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.selected {
        color: var(--primary-color);
        border: 2px solid var(--primary-color);
      }
    }
  }

}
</style>
