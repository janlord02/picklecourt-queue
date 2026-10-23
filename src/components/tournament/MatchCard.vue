<template>
  <component
    :is="clickable ? 'button' : 'div'"
    type="button"
    class="t-match"
    :class="[`t-match--${match.status}`, { 't-match--clickable': clickable, 't-match--compact': compact }]"
    @click="clickable && $emit('open', match)"
  >
    <div class="t-match__head">
      <span class="tnum">M{{ match.number }}</span>
      <span v-if="!compact" class="ellipsis">· {{ match.label }}</span>
      <q-space />
      <span v-if="match.status === 'live'" class="live-tag t-live">Live</span>
      <span v-else-if="match.court && match.status !== 'completed'" class="t-court">{{ match.court }}</span>
      <span v-else-if="match.result_note === 'walkover'" class="t-court">W/O</span>
    </div>
    <div
      v-for="side in ['A', 'B']"
      :key="side"
      class="t-match__row"
      :class="{
        'is-winner': winnerSide === side,
        'is-loser': winnerSide && winnerSide !== side,
        'is-tbd': !entryId(side),
        'is-serving': match.live?.serving === side,
      }"
    >
      <span class="t-seed tnum">{{ seed(side) }}</span>
      <span class="t-name ellipsis">{{ slotName(match, side, entries) }}</span>
      <span v-for="(g, i) in match.games" :key="i" class="t-game tnum">{{ side === 'A' ? g.a : g.b }}</span>
      <span v-if="match.live" class="t-game t-game--live tnum">{{ side === 'A' ? match.live.a : match.live.b }}</span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { slotName } from 'src/utils/tournament'

const props = defineProps({
  match: { type: Object, required: true },
  entries: { type: Object, required: true }, // id → entry
  clickable: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})
defineEmits(['open'])

const entryId = (side) => (side === 'A' ? props.match.entry_a_id : props.match.entry_b_id)
const seed = (side) => props.entries[entryId(side)]?.seed ?? ''
const winnerSide = computed(() => {
  const w = props.match.winner_entry_id
  if (!w || !['completed', 'bye'].includes(props.match.status)) return null
  return w === props.match.entry_a_id ? 'A' : 'B'
})
</script>

<style scoped lang="scss">
.t-match {
  display: block;
  width: 100%;
  min-width: 200px;
  text-align: left;
  font: inherit;
  color: var(--ink); // own color: also sits on the dark TV monitor
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 10px;
}
.t-match--clickable {
  cursor: pointer;
  &:hover { border-color: #c9d4cf; }
  &:focus-visible { outline: 2px solid var(--brand-teal); outline-offset: 2px; }
}
.t-match--live { border-color: #fca5a5; box-shadow: 0 0 0 1px #fecaca inset; }
.t-match--bye,
.t-match--void { opacity: 0.55; }
.t-match__head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-faint);
  margin-bottom: 4px;
}
.t-live { font-size: 10px; padding: 0 6px; }
.t-court { color: var(--brand-teal); }
.t-match__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 3px 0;
  &.is-winner { font-weight: 700; }
  &.is-loser { color: var(--ink-muted); }
  &.is-tbd .t-name { color: var(--ink-faint); font-style: italic; }
  &.is-serving .t-name::after {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--lime);
    box-shadow: 0 0 0 1px #7a9400;
    margin-left: 6px;
    vertical-align: middle;
  }
}
.t-seed { width: 16px; font-size: 11px; color: var(--ink-faint); text-align: right; flex: none; }
.t-name { flex: 1; min-width: 0; }
.t-game { width: 22px; text-align: center; flex: none; }
.t-game--live { font-weight: 800; color: #dc2626; }
</style>
