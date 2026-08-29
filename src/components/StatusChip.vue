<template>
  <span class="status-tag">
    <i class="status-dot" :class="`dot-${status}`" />
    <span>{{ statusLabel(status) }}</span>
  </span>
</template>

<script setup>
import { statusLabel } from 'src/utils/format'

defineProps({
  status: { type: String, required: true },
})
</script>
