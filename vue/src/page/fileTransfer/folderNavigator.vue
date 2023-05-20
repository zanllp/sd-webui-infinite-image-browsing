<script setup lang="ts">
import { ref } from 'vue'
import { deepComputedEffect } from 'vue3-ts-util'
const props = defineProps<{ loc: string }>()
const loc = deepComputedEffect(() => props.loc)
const emit = defineEmits<{ (e: 'to', loc: string): void }>()
const visible = ref(false)
const onOK = () => {
  visible.value = false
  emit('to', loc.value)
}
</script>
<template>
  <a-modal v-model:visible="visible" :title="$t('inputAddressAndPressEnter')" @ok="onOK">
    <a-input @press-enter="onOK" v-model:value="loc" style="width: 100%" allow-clear></a-input>
  </a-modal>
  <a @click="visible = true">{{ $t('go') }}</a>
</template>
