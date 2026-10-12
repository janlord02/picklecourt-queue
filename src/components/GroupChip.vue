<template>
  <!-- Court segregation group tag (e.g. "Beginner"): the group's color as a
       tinted pill with its name. Same look on the organizer console, player
       screens and the TV board; `dark` is for the board's dark background,
       `compact` for tight spots (inside a match lineup). -->
  <span
    v-if="group"
    class="group-chip"
    :class="[`group-chip--${compact ? 'xs' : size}`, { 'group-chip--dark': dark }]"
    :style="chipStyle"
  >{{ group.name }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // { id, name, color } — null renders nothing.
  group: { type: Object, default: null },
  size: { type: String, default: 'sm' }, // sm | md | lg (TV)
  dark: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

function rgba(hex, alpha) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  if (!m) return `rgba(100, 116, 139, ${alpha})`
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

// Light screens: tinted pill, text in the group color. TV board: solid pill
// in the group color with white text so it reads from across the room.
const chipStyle = computed(() => {
  const color = props.group?.color || '#64748b'
  return props.dark
    ? { background: color, borderColor: color }
    : { color, background: rgba(color, 0.12), borderColor: rgba(color, 0.32) }
})
</script>

<style scoped>
.group-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  vertical-align: middle;
}
.group-chip--xs { padding: 0 6px; font-size: 10px; }
.group-chip--sm { padding: 1px 8px; font-size: 11px; }
.group-chip--md { padding: 3px 10px; font-size: 13px; }
.group-chip--lg { padding: 4px 14px; font-size: 1.05rem; }
.group-chip--dark { color: #fff; }
</style>
