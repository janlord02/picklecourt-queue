<template>
  <span class="status-tag" :class="`dot-${status}`">{{ statusLabel(status) }}</span>
</template>

<script setup>
import { statusLabel } from 'src/utils/format'

defineProps({
  status: { type: String, required: true },
})
</script>
