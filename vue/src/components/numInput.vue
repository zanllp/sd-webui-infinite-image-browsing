<script setup lang="ts">
const model = defineModel<number>()
const props = defineProps<{ min: number, max: number, step: number }>()

</script>
<template>
  <div class="num-input">
    <a-input-number v-model:value="model" v-bind="props" />
    <a-slider v-model:value="model" v-bind="props" class="slide"/>
  </div>
</template>
<style lang="scss" scoped>

.num-input {
  display: flex;
  .slide {
    flex: 1;
    max-width: 256px;
    margin-left: 8px;
  }
}
</style>