<template>
  <div
    class="toc-item"
    :class="{ 'is-active': isActive }"
    :style="{ paddingLeft: `${(item.level - 1) * 16}px` }"
    @click="handleClick"
  >
    <span class="toc-text">{{ item.text }}</span>
  </div>
</template>

<script setup lang="ts">
import type { TocItem as TocItemType } from '~/composables/useTableOfContents'

const props = defineProps<{
  item: TocItemType
  isActive: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
}>()

function handleClick() {
  emit('click', props.item.id)
}
</script>

<style scoped>
.toc-item {
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease, padding-left 0.15s ease;
  margin: 2px 0;
}

.toc-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.toc-item.is-active {
  background-color: rgba(var(--v-theme-primary), 0.12);
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: calc((var(--level, 0) - 1) * 16px + 9px);
}

.toc-text {
  font-size: 0.813rem;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface-rail));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s ease;
}

.toc-item:hover .toc-text {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.toc-item.is-active .toc-text {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* Touch target size for mobile */
@media (max-width: 599px) {
  .toc-item {
    min-height: 44px;
  }
}
</style>
