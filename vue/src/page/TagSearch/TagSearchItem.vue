<template>
  <div class="tag-wrap">
    <div class="float-actions">
      <div @click="$emit('toggleAnd')">{{ $t('exactMatch') }}
      </div>
      <div @click="$emit('toggleOr')">{{ $t('anyMatch')
        }}</div>
      <div @click="$emit('toggleNot')">{{ $t('exclude')
        }}</div>
    </div>

    <li class="tag" :title="toTagDisplayName(tag)" 
      :class="{ selected }" @click="$emit('click')">
      <div v-if="isCustomTag" style="width: 24px;height: 24px;overflow: hidden;border-radius: 6px; margin-right: 8px;" @click.stop>
        <ColorPicker  :pureColor="tagStore.getColor(tag)" @update:pureColor="onTagColorChange" />
      </div>
      <CheckOutlined v-if="selected" />
      <div class="tag-name">
        {{ toTagDisplayName(tag) }}
      </div>
      <span v-if="isCustomTag && idx !== 0" class="remove" @click.capture.stop="$emit('remove')">
        <CloseOutlined />
      </span>
    </li>
  </div>
</template>
<script setup lang="ts">

import { CheckOutlined, CloseOutlined } from '@/icon'
import {
  type Tag,
} from '@/api/db'
import { ColorPicker } from 'vue3-colorpicker'
import 'vue3-colorpicker/style.css'
import { useTagStore } from '@/store/useTagStore'
import { computed } from 'vue'

const tagStore = useTagStore()

const onTagColorChange = (color: string) => {
  emit('tagColorChange', color)
}

const props = defineProps<{
  tag: Tag,
  name: string,
  selected: boolean,
  idx: number
}>()

const isCustomTag = computed(() => props.name === 'custom')
const emit = defineEmits(['remove', 'toggleAnd', 'toggleNot', 'toggleOr', 'click', 'tagColorChange'])
const toTagDisplayName = (v: Tag, withType = false) =>
  (withType ? `[${v.type}] ` : '') + (v.display_name ? `${v.display_name} : ${v.name}` : v.name)

</script>
<style lang="scss" scoped>
.tag-wrap {
  display: inline-block;
  position: relative;

  &:hover .float-actions,
  .float-actions：hover {
    display: flex;
    flex-wrap: nowrap;
    opacity: 1;
    max-height: 100px;
  }


  .tag {
    border: 2px solid var(--zp-secondary);
    color: var(--zp-primary);
    border-radius: 999px;
    padding: 4px 16px;
    margin: 4px;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-direction: row;
    gap: 4px;

    &.selected {
      color: var(--primary-color);
      border: 2px solid var(--primary-color);
    }
  }

  .tag-name {
    max-width: 192px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .float-actions {
    position: absolute;
    left: 0;
    top: -32px;
    transition-delay: 0.5s;
    transition-duration: 0.3s;
    background: var(--zp-primary-background);
    padding-bottom: 2px;
    box-sizing: border-box;
    border-radius: 4px;
    user-select: none;
    display: none;
    opacity: 0;
    max-height: 0;
    overflow: hidden;
    z-index: 9999;
    transition-property: opacity, max-height;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
    padding: 4px;
    box-shadow: 0px 4px 16px var(--zp-luminous-deep);

    border-bottom: 3px solid var(--zp-luminous);


    div {
      background: var(--zp-secondary-background);
      cursor: pointer;
      white-space: pre;
      font-size: 12px;
      padding: 1px 4px;

      &:hover {

        background: var(--zp-secondary-variant-background);
      }
    }

    &> :not(:last-child) {
      margin-right: 4px;
    }
  }

}
</style>