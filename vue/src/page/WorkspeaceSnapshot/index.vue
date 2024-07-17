<script lang="ts" setup>
import { useGlobalStore } from '@/store/useGlobalStore'
import { useWorkspeaceSnapshot, Snapshot } from '@/store/useWorkspeaceSnapshot'
import { cloneDeep } from 'lodash-es'
import { removeAppFeSetting } from '@/api'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { ref } from 'vue'
import { actionConfirm } from '@/util'

const g = useGlobalStore()
defineProps<{
  tabIdx: number
  paneIdx: number
  id: string,
  paneKey: string
}>()
const store = useWorkspeaceSnapshot()

const onRestore = (snap: Snapshot) => {
  g.tabList = cloneDeep(snap.tabs)
}

const onRemove = actionConfirm(async (snap: Snapshot) => {
  
  await removeAppFeSetting(`workspace_snapshot_${snap.id}`)
  store.snapshots = store.snapshots.filter(item => item.id !== snap.id)
  message.success(t('deleteSuccess'))
})

const name = ref('')

const onCreate = async () => {
  if (!name.value) {
    message.error(t('nameRequired'))
    return

  }
  const snap = store.createSnapshot(name.value)
  await store.addSnapshot(snap)
  message.success(t('saveCompleted'))

}

</script>
<template>
  <div class="container">
    <div class="actions">
      <a-input v-model:value="name" :placeholder="$t('name')" style="max-width: 300px;" />
      <a-button type="primary" @click="onCreate">{{ $t('saveWorkspaceSnapshot') }}</a-button>
    </div>
    <p class="uni-desc">
     {{ $t('WorkspaceSnapshotDesc') }}
    </p>
    <ul class="snapshot">
      <li v-for="item in store.snapshots" :key="item.id">
        <div>
          <span>{{ item.name }}</span>
        </div>
        <div>
          <a-button @click="onRestore(item)">{{ $t('restore') }}</a-button>
          <a-button @click="onRemove(item)">{{ $t('remove') }}</a-button>
        </div>
      </li>
    </ul>
  </div>
</template>
<style scoped lang="scss">
.container {
  background: var(--zp-secondary-background);

  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  .actions {
    margin-bottom: 16px;
    * {
      margin-right: 10px;
    }
  }
}


.snapshot {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 512px;
  
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background-color: var(--zp-secondary-variant-background);
    border-radius: 4px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
    border-bottom: 2px solid var(--zp-luminous-deep);
    &:hover {
      border-bottom: 2px solid var(--zp-luminous);
    }

    div:first-child {
      flex-grow: 1;
      font-weight: bold;
    }

    div:last-child {
      display: flex;
      gap: 10px;
    }

  }
}
</style>
