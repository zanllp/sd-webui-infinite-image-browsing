<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue'
import {
  getDbBasicInfo,
  updateImageData,
  type DataBaseBasicInfo,
  type Tag,
  addCustomTag,
  removeCustomTag,
  getExpiredDirs,
  type MatchImageByTagsReq
} from '@/api/db'
import { SearchSelect } from 'vue3-ts-util'
import { CheckOutlined, PlusOutlined, CloseOutlined, ArrowRightOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { groupBy, uniqueId } from 'lodash-es'
import { createReactiveQueue, type Dict, useGlobalEventListen } from '@/util'
import { Modal, message } from 'ant-design-vue'
import { t } from '@/i18n'
import { makeAsyncFunctionSingle } from '@/util'

const props = defineProps<{ tabIdx: number; paneIdx: number }>()
const global = useGlobalStore()
const queue = createReactiveQueue()
const loading = computed(() => !queue.isIdle)
const info = ref<DataBaseBasicInfo>()

const matchIds = ref<MatchImageByTagsReq>({ and_tags: [], or_tags: [], not_tags: [] })
const tags = computed(() =>
  info.value ? info.value.tags.slice().sort((a, b) => b.count - a.count) : []
)
const classSort = [
  'custom',
  'Model',
  'lora',
  'lyco',
  'pos',
  'size',
  'Postprocess upscaler',
  'Postprocess upscale by',
  'Sampler'
].reduce((p, c, i) => {
  p[c] = i
  return p
}, {} as Dict<number>)

const classifyTags = computed(() => {
  return Object.entries(groupBy(tags.value, (v) => v.type)).sort(
    (a, b) => classSort[a[0]] - classSort[b[0]]
  )
})
const pairid = uniqueId()
const openedKeys = ref((classifyTags.value.map(v => v[0])))
onMounted(async () => {
  info.value = await getDbBasicInfo()
  openedKeys.value = (classifyTags.value.map(v => v[0]))
  if (info.value.img_count && info.value.expired) {
    onUpdateBtnClick()
  }
})

useGlobalEventListen('searchIndexExpired', () => info.value && (info.value.expired = true))

const onUpdateBtnClick = makeAsyncFunctionSingle(
  () =>
    queue.pushAction(async () => {
      await updateImageData()
      info.value = await getDbBasicInfo()
      openedKeys.value = (classifyTags.value.map(v => v[0]))
      return info.value
    }).res
)

const query = () => {
  global.openTagSearchMatchedImageGridInRight(props.tabIdx, pairid, matchIds.value)
}

useGlobalEventListen('returnToIIB', async () => {
  const res = await queue.pushAction(getExpiredDirs).res
  info.value!.expired = res.expired
})

const toTagDisplayName = (v: Tag, withType = false) =>
  (withType ? `[${v.type}] ` : '') + (v.display_name ? `${v.display_name} : ${v.name}` : v.name)
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
  if (info.value?.tags.find((v) => v.id === tag.id)) {
    message.error(t('alreadyExists'))
  } else {
    info.value?.tags.push(tag)
    global.conf?.all_custom_tags.push(tag)
  }
  addTagName.value = ''
  addInputing.value = false
}
const onTagRemoveClick = (tagId: number) => {
  Modal.confirm({
    title: t('confirmDelete'),
    async onOk () {
      await removeCustomTag({ tag_id: tagId })
      const idx = info.value?.tags.findIndex((v) => v.id === tagId) ?? -1
      info.value?.tags.splice(idx, 1)
      global.conf?.all_custom_tags.splice(
        global.conf?.all_custom_tags.findIndex((v) => v.id === tagId),
        1
      )
    }
  })
}
const selectedTagIds = computed(
  () => new Set([matchIds.value.and_tags, matchIds.value.or_tags, matchIds.value.not_tags].flat())
)
const onTagClick = (tag: Tag) => {
  if (selectedTagIds.value.has(tag.id)) {
    matchIds.value.and_tags = matchIds.value.and_tags.filter((v) => v !== tag.id)
    matchIds.value.or_tags = matchIds.value.or_tags.filter((v) => v !== tag.id)
    matchIds.value.not_tags = matchIds.value.not_tags.filter((v) => v !== tag.id)
  } else {
    matchIds.value.and_tags.push(tag.id)
  }
}

const conv = {
  value: (v: Tag) => v.id,
  text: toTagDisplayName,
  optionText: (v: Tag) => toTagDisplayName(v, true)
}
</script>
<template>
  <div class="container">
    <ASelect v-if="false" />
    <template v-if="info">
      <div>
        <div class="search-bar">
          <div class="form-name">{{ $t('exactMatch') }}</div>
          <SearchSelect :conv="conv" mode="multiple" style="width: 100%" :options="tags" v-model:value="matchIds.and_tags"
            :disabled="!tags.length" :placeholder="$t('selectExactMatchTag')" />
          <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary"
            v-if="info.expired || !info.img_count">
            {{ info.img_count === 0 ? $t('generateIndexHint') : $t('UpdateIndex') }}</AButton>
          <AButton v-else type="primary" @click="query" :loading="!queue.isIdle" :disabled="!matchIds.and_tags.length">{{
            $t('search') }}
          </AButton>
        </div>
        <div class="search-bar">
          <div class="form-name">{{ $t('anyMatch') }}</div>
          <SearchSelect :conv="conv" mode="multiple" style="width: 100%" :options="tags" v-model:value="matchIds.or_tags"
            :disabled="!tags.length" :placeholder="$t('selectAnyMatchTag')" />
        </div>
        <div class="search-bar">
          <div class="form-name">{{ $t('exclude') }}</div>
          <SearchSelect :conv="conv" mode="multiple" style="width: 100%" :options="tags" v-model:value="matchIds.not_tags"
            :disabled="!tags.length" :placeholder="$t('selectExcludeTag')" />
        </div>
      </div>

      <p class="generate-idx-hint" v-if="!tags.filter((v) => v.type !== 'custom').length">
        {{ $t('needGenerateIdx') }}
      </p>
      <div class="list-container">
        <ul class="tag-list" :key="name" v-for="[name, list] in classifyTags">
          <h3 class="cat-name"
            @click="!openedKeys.includes(name) ? openedKeys.push(name) : openedKeys.splice(openedKeys.indexOf(name), 1)">
            <ArrowRightOutlined class="arrow" :class="{ down: openedKeys.includes(name) }" />
            {{ $t(name) }}
          </h3>
          <a-collapse ghost v-model:activeKey="openedKeys">
            <template #expandIcon></template>
            <a-collapse-panel :key="name">
              <li v-for="(tag, idx) in list" :key="tag.id" class="tag" :class="{ selected: selectedTagIds.has(tag.id) }"
                @click="onTagClick(tag)">
                <CheckOutlined v-if="selectedTagIds.has(tag.id)" />
                {{ toTagDisplayName(tag) }}
                <span v-if="name === 'custom' && idx !== 0" class="remove" @click.capture.stop="onTagRemoveClick(tag.id)">
                  <CloseOutlined />
                </span>
              </li>
              <li v-if="name === 'custom'" class="tag" @click="addInputing = true">
                <template v-if="addInputing">
                  <a-input-group compact>
                    <a-input v-model:value="addTagName" style="width: 128px" :loading="loading" allow-clear
                      size="small" />
                    <a-button size="small" type="primary" @click.capture.stop="onAddTagBtnSubmit" :loading="loading">{{
                      addTagName ? $t('submit') : $t('cancel') }}</a-button>
                  </a-input-group>
                </template>
                <template v-else>
                  <PlusOutlined /> {{ $t('add') }}
                </template>
              </li>
            </a-collapse-panel>
          </a-collapse>
        </ul>
      </div>
    </template>
  </div>
</template>
<style scoped lang="scss">
:deep() {
  .ant-collapse>.ant-collapse-item>.ant-collapse-header {
    padding: 0;
  }
}

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
      background-color: var(--zp-secondary-background);
    }
  }

  .select {
    padding: 8px;
  }

  .search-bar {
    padding: 8px;
    display: flex;

    .form-name {
      flex-shrink: 0;
      padding: 4px 8px;
      width: 128px;
    }
  }

  .list-container {
    background-color: var(--zp-secondary-background);
    overflow: scroll;
  }

  .cat-name {
    user-select: none;
    position: sticky;
    top: 0;
    padding: 4px 16px;
    background: var(--zp-primary-background);
    margin: 4px;
    transition: all .3s ease;
    border-left: 4px solid var(--primary-color);
    cursor: pointer;

    &:hover {
      border-radius: 4px;
      background-color: var(--zp-secondary-background);
    }

    .arrow {
      color: var(--primary-color);
      transition: all .3s ease;
      margin-right: 16px;

      &.down {
        transform: rotate(90deg);
      }
    }
  }

  .tag-list {
    list-style: none;
    padding: 0;
    margin: 16px;
    border-radius: 16px;
    background: var(--zp-primary-background);
    padding: 8px;


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
