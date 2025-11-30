<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { setAppFeSetting } from '@/api'
import { useGlobalStore } from '@/store/useGlobalStore'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { SearchSelect } from 'vue3-ts-util'
import type { Tag } from '@/api/db'

interface Filter {
  field: string
  operator: string
  value: string
}

interface Rule {
  tag: string
  filters: Filter[]
}

const rules = ref<Rule[]>([])
const globalStore = useGlobalStore()

// 获取自定义标签列表
const customTags = computed(() => {
  return globalStore.conf?.all_custom_tags?.filter(tag => tag.type === 'custom') || []
})

// SearchSelect 转换器
const tagConv = {
  value: (v: Tag) => v.name,
  text: (v: Tag) => v.display_name ? `${v.display_name} : ${v.name}` : v.name
}

onMounted(() => {
  const savedRules = globalStore.conf?.app_fe_setting?.auto_tag_rules
  if (savedRules) {
    rules.value = savedRules
  }
})

const addRule = () => {
  rules.value.push({
    tag: '',
    filters: []
  })
}

const removeRule = (index: number) => {
  rules.value.splice(index, 1)
}

const addFilter = (rule: Rule) => {
  rule.filters.push({
    field: 'pos_prompt',
    operator: 'contains',
    value: ''
  })
}

const removeFilter = (rule: Rule, index: number) => {
  rule.filters.splice(index, 1)
}

const save = async () => {
  try {
    await setAppFeSetting('auto_tag_rules' as any, rules.value)
    message.success(t('autoTag.saveSuccess'))
    // Update local store
    if (globalStore.conf && globalStore.conf.app_fe_setting) {
      globalStore.conf.app_fe_setting.auto_tag_rules = rules.value
    }
  } catch (e) {
    message.error(t('autoTag.saveFail') + ': ' + e)
  }
}

const fieldOptions = computed(() => [
  { label: t('autoTag.fields.posPrompt'), value: 'pos_prompt' },
  { label: t('autoTag.fields.negPrompt'), value: 'neg_prompt' },
  { label: t('autoTag.fields.model'), value: 'Model' },
  { label: t('autoTag.fields.sampler'), value: 'Sampler' },
  { label: t('autoTag.fields.size'), value: 'Size' },
  { label: t('autoTag.fields.cfgScale'), value: 'CFG scale' },
  { label: t('autoTag.fields.steps'), value: 'Steps' },
  { label: t('autoTag.fields.seed'), value: 'Seed' }
])

const operatorOptions = computed(() => [
  { label: t('autoTag.operators.contains'), value: 'contains' },
  { label: t('autoTag.operators.equals'), value: 'equals' },
  { label: t('autoTag.operators.regex'), value: 'regex' }
])

</script>

<template>
  <div class="auto-tag-settings">
    <div class="header">
      <div class="description">{{ t('autoTag.description') }}</div>
      <div class="actions">
        <a-button type="primary" @click="addRule">
          <template #icon><PlusOutlined /></template>
          {{ t('autoTag.addRule') }}
        </a-button>
        <a-button type="primary" @click="save" style="margin-left: 16px;">{{ t('autoTag.saveConfig') }}</a-button>
      </div>
    </div>
    
    <div class="rules-list">
      <div v-for="(rule, rIndex) in rules" :key="rIndex" class="rule-card">
        <div class="rule-header">
          <SearchSelect 
            :conv="tagConv" 
            style="width: 240px" 
            :options="customTags"
            v-model:value="rule.tag" 
            :disabled="!customTags.length"
            :placeholder="t('autoTag.inputTagName')" 
          />
          <a-button type="text" danger @click="removeRule(rIndex)">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </div>
        
        <div class="filters-list">
          <div v-for="(filter, fIndex) in rule.filters" :key="fIndex" class="filter-row">
            <a-select v-model:value="filter.field" style="width: 240px" :options="fieldOptions" />
            <a-select v-model:value="filter.operator" style="width: 160px" :options="operatorOptions" />
            <a-input v-model:value="filter.value" :placeholder="t('autoTag.value')" style="flex: 1" />
            <a-button type="text" danger @click="removeFilter(rule, fIndex)">
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>
          <a-button type="dashed" block @click="addFilter(rule)" style="margin-top: 8px">
            <template #icon><PlusOutlined /></template>
            {{ t('autoTag.addFilter') }}
          </a-button>
        </div>
      </div>
    </div>
    <div v-if="rules.length === 0" class="empty-tip">
      {{ t('autoTag.noRules') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.auto-tag-settings {
  padding: 16px;
}

.header {
  margin-bottom: 16px;
  
  .description {
    padding: 12px 16px;
    margin-bottom: 12px;
    background: var(--zp-secondary-background);
    border-left: 4px solid var(--primary-color);
    border-radius: 4px;
    color: var(--zp-secondary-text);
    font-size: 14px;
  }
  
  .actions {
    display: flex;
  }
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-card {
  border: 1px solid var(--zp-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--zp-secondary-background);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--zp-border);
}

.filters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.empty-tip {
  text-align: center;
  color: var(--zp-secondary-text);
  padding: 32px;
}
</style>
