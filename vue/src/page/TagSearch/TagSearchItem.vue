<template>
  <div class="tag-wrap">
    <div class="float-actions">
      <a-button size="small" @click="$emit('toggleAnd')">{{ $t('exactMatch') }}
      </a-button>
      <a-button size="small" @click="$emit('toggleOr')">{{ $t('anyMatch')
        }}</a-button>
      <a-button size="small" @click="$emit('toggleNot')">{{ $t('exclude')
        }}</a-button>
    </div>
    <li class="tag" :title="toTagDisplayName(tag)" :class="{ selected }" @click="$emit('click')">
      <CheckOutlined v-if="selected" />
      {{ toTagDisplayName(tag) }}
      <span v-if="name === 'custom' && idx !== 0" class="remove" @click.capture.stop="$emit('remove')">
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
defineProps<{
  tag: Tag,
  name: string,
  selected: boolean,
  idx: number
}>()
defineEmits(['remove', 'toggleAnd', 'toggleNot', 'toggleOr', 'click'])
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

  .float-actions {
    position: absolute;
    left: 0;
    top: -28px;
    transition-delay: 0.5s;
    transition-duration: 0.3s;
    background: white;
    padding-bottom: 2px;
    box-sizing: border-box;
    border-radius: 4px;
    user-select: none;
    display: none;
    opacity: 0;
    max-height: 0;
    overflow: hidden;

    transition-property: opacity, max-height;
    transition-duration: 0.5s;
    transition-timing-function: ease-in-out;
    padding: 2px;
    box-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.12),
      0 2px 3px rgba(0, 0, 0, 0.16);
    border-bottom: 2px solid #1453ad;

    &> :not(:last-child) {
      margin-right: 2px;
    }
  }

}
</style>